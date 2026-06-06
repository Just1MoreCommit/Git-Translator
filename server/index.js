const express = require('express'); //importing packages
const cors = require('cors'); //importing packages

const app = express(); //Creates the actual express application. express() returns app object with all methods like defining routes, starting server, etc.

app.use(cors()); //Middleware, this tells express to allow requests from different origins
app.use(express.json()); //tells express to automatically parse incoming request bodies as JSON. Wihtout this, when frontedn sends data, express wouldnt know how to read it

// ============================================
// CACHING SETUP
// ============================================
// In-memory cache: key = "owner/repo:endpoint", value = { data, timestamp, linkHeader }
const cache = new Map();

// Cache TTL: 5 minutes in milliseconds
const CACHE_TTL = 5 * 60 * 1000;

function getCacheKey(owner, repo, endpoint) {
  return `${owner}/${repo}:${endpoint}`;
}

function isCacheValid(timestamp) {
  return (Date.now() - timestamp) < CACHE_TTL;
}
// ============================================

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Gitly API is running', version: '2.0' });
});

// GitHub Proxy Route
// Uses app.use to match all nested paths (Express 5 compatible)
app.use('/api/github', async (req, res) => {
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.log('[Proxy] GITHUB_TOKEN missing, env vars:', Object.keys(process.env).filter(k => k.includes('TOKEN') || k.includes('KEY')));
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured on server' });
  }
  
  // Build the full GitHub URL from the request
  // req.path includes the path after /api/github
  const githubPath = req.path.substring(1); // Remove leading slash
  const queryString = req.url.split('?')[1] || '';
  const githubUrl = `https://api.github.com/${githubPath}${queryString ? '?' + queryString : ''}`;
  
  // Parse owner/repo from the GitHub path for caching
  const pathParts = githubPath.split('/');
  const owner = pathParts[1] || 'unknown';
  const repo = pathParts[2] || 'unknown';
  const cacheKey = getCacheKey(owner, repo, githubPath);
  
  // Check cache first
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
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'Gitly-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const data = await response.json();
    
    // Store in cache after successful fetch
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      linkHeader: response.headers.get('Link')
    });
    
    // Forward the status code and headers
    res.status(response.status);
    
    // Forward the Link header if it exists (for pagination)
    const linkHeader = response.headers.get('Link');
    if (linkHeader) {
      res.set('Link', linkHeader);
    }
    
    res.json(data);
  } catch (err) {
    console.error('[Proxy] Error:', err);
    res.status(500).json({ error: 'Failed to proxy GitHub request', message: err.message });
  }
});

app.post('/summarize', async (req, res) => { //defines a POST route at /summarize. whne frontend does fetch then this runs.. req: incoming reques contains everything frontend sent. res is the response. backend -> frontend. asyncL api calls take time u need async/await
  const { commits } = req.body;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Here are git commit messages from a project. Write a clear, well structured paragraph in plain English explaining what this project does, how it evolved over time, and what was recently worked on:\n\n${commits.join('\n')}`
        }]
      }]
    })
  });


  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
  const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!summary) {
  console.log('Full Gemini response:', JSON.stringify(data, null, 2));
  return res.status(500).json({ error: 'Could not parse Gemini response' });
}

res.json({summary});

});

app.listen(process.env.PORT || 3000, () => {
    console.log('server running on port 3000');
});
