require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security headers
app.use(helmet());

// CORS: allow only specific origins
const ALLOWED_ORIGINS = [
  'https://gitly-tau.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) === -1) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    return callback(null, true);
  },
  exposedHeaders: ['Link']
}));

app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
// ============================================
// CACHING SETUP
// ============================================
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

function getCacheKey(owner, repo, endpoint) {
  return `${owner}/${repo}:${endpoint}`;
}

function isCacheValid(timestamp) {
  return (Date.now() - timestamp) < CACHE_TTL;
}

function setCache(key, value) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  cache.set(key, value);
}
// ============================================

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Gitly API is running', version: '2.0' });
});

// GitHub Proxy Route
// Only allow specific safe endpoints to prevent SSRF
const ALLOWED_GITHUB_PATHS = /^repos\/[^\/]+\/[^\/]+(\/(commits|languages|contributors|tags|stats\/commit_activity)(\/.*)?)?$/;

app.use('/api/github', limiter, async (req, res) => {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error('[Proxy] GITHUB_TOKEN not configured on server');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  const githubPath = req.path.substring(1);
  const queryString = req.url.split('?')[1] || '';
  
  // SSRF protection: validate path
  if (!ALLOWED_GITHUB_PATHS.test(githubPath)) {
    console.error(`[Proxy] Blocked request to invalid path: ${githubPath}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const githubUrl = `https://api.github.com/${githubPath}${queryString ? '?' + queryString : ''}`;
  
  const pathParts = githubPath.split('/');
  const owner = pathParts[1] || 'unknown';
  const repo = pathParts[2] || 'unknown';
  const cacheKey = getCacheKey(owner, repo, githubPath + (queryString ? '?' + queryString : ''));
  
  const cached = cache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    console.log(`[Cache] Hit for ${cacheKey}`);
    res.status(200);
    if (cached.linkHeader) {
      res.set('Link', cached.linkHeader);
    }
    return res.json(cached.data);
  }
  
  console.log(`[Proxy] Fetching ${githubUrl}`);
  
  try {
    const response = await fetch(githubUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'Gitly-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const data = await response.json();
    
    // Log GitHub errors for debugging
    if (response.status === 401 || response.status === 403) {
      console.error(`[Proxy] GitHub ${response.status} for ${githubUrl}:`, JSON.stringify(data));
    }
    
    setCache(cacheKey, {
      data,
      timestamp: Date.now(),
      linkHeader: response.headers.get('Link')
    });
    
    res.status(response.status);
    
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      res.set('Link', linkHeader);
    }
    
    res.json(data);
  } catch (err) {
    console.error('[Proxy] Error:', err);
    res.status(500).json({ error: 'Failed to proxy GitHub request' });
  }
});

async function callGemini(model, promptText, geminiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }]
    })
  });
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { ok: res.ok, status: res.status, data, text };
}

app.post('/summarize', limiter, async (req, res) => {
  const { repoName, commits } = req.body;
  
  // Input validation
  if (!repoName || typeof repoName !== 'string') {
    return res.status(400).json({ error: 'repoName must be a non-empty string' });
  }
  if (!Array.isArray(commits)) {
    return res.status(400).json({ error: 'commits must be an array' });
  }
  if (commits.length > 100) {
    return res.status(400).json({ error: 'commits array exceeds maximum length of 100' });
  }
  for (let i = 0; i < commits.length; i++) {
    if (typeof commits[i] !== 'string') {
      return res.status(400).json({ error: `commits[${i}] must be a string` });
    }
    if (commits[i].length > 500) {
      return res.status(400).json({ error: `commits[${i}] exceeds maximum length of 500 characters` });
    }
  }
  
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    console.error('[Summarize] GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  const promptText = `You are a senior developer writing a concise project briefing for a technical audience.

Analyze the git commit messages from "${repoName}" and produce a structured summary.

=== STRICT OUTPUT FORMAT ===
You MUST use these exact four headers. Each header must start on its own line with "## " followed by the header name.

## Project Purpose
[1-2 sentences]

## Evolution Timeline
[2-3 sentences]

## Recent Focus
[1-2 sentences]

## Key Themes
[3-5 comma-separated tags, no bullets]

=== RULES ===
- Be specific. Avoid generic filler.
- Infer intent from terse commits.
- If a section cannot be inferred, write "Insufficient commit data."
- Keep total under 250 words.
- NO EMOJIS. NO CODE BLOCKS. NO BULLET LISTS.
- USE THE HEADERS ABOVE. DO NOT OUTPUT A SINGLE PARAGRAPH.

Commit messages (oldest → newest):
${commits.join('\n')}`;
  
  try {
    // PRIMARY: try gemini-2.5-flash
    let result = await callGemini('gemini-2.5-flash', promptText, geminiKey);
    const hasHeaders = /^##\s+/m.test(result.text);
    
    // RETRY: if HTTP failed or content lacks headers, fallback to 2.0-flash
    if (!result.ok || result.status !== 200 || !hasHeaders) {
      console.log(`[Summarize] 2.5-flash failed — status: ${result.status}, hasHeaders: ${hasHeaders}. Retrying with 2.0-flash...`);
      result = await callGemini('gemini-2.0-flash', promptText, geminiKey);
      console.log(`[Summarize] 2.0-flash result — status: ${result.status}, hasHeaders: ${/^##\s+/m.test(result.text)}`);
    }
    
    if (!result.ok || result.status !== 200) {
      console.error('[Summarize] Both models failed. Last status:', result.status);
      return res.status(500).json({ error: 'AI summarization unavailable' });
    }
    
    const summary = result.text;
    if (!summary) {
      console.log('Full Gemini response:', JSON.stringify(result.data, null, 2));
      return res.status(500).json({ error: 'Could not parse Gemini response' });
    }
    
    res.json({summary});
  } catch (err) {
    console.error('[Summarize] Error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Not allowed by CORS' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function validateGitHubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('[Startup] GITHUB_TOKEN is missing. GitHub API calls will fail.');
    return;
  }
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Gitly-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (res.status === 200) {
      const user = await res.json();
      console.log(`[Startup] GitHub token is valid. Authenticated as: ${user.login}`);
    } else if (res.status === 401) {
      console.error('[Startup] GitHub token is INVALID or REVOKED (401). Check your Railway env var.');
    } else if (res.status === 403) {
      const body = await res.json();
      console.error('[Startup] GitHub token returned 403:', JSON.stringify(body));
    } else {
      console.error(`[Startup] GitHub token check returned ${res.status}`);
    }
  } catch (err) {
    console.error('[Startup] Failed to validate GitHub token:', err.message);
  }
}

app.listen(process.env.PORT || 3000, () => {
    console.log('server running on port 3000');
    validateGitHubToken();
});
