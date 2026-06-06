require('./style.css');

console.log('Gitly app loaded');

const table = document.getElementById('table');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const toast = document.getElementById('toast');
const decodeBtn = document.getElementById('decode');

// Backend API URL — hardcoded for now
// TODO: Make this configurable (env var or config file)
const API_BASE = 'https://git-translator-production-5992.up.railway.app';

// State
let allCommits = [];
let sliderPos = 0; // 0 = max commits, 1 = 10 commits
let isDragging = false;
let currentPage = 1;
let cooldownTimer = null;
let cooldownSeconds = 0;
let consecutiveErrors = 0;
let maxCommits = 500; // fixed max slider value
const COMMITS_PER_PAGE = 100;
const COOLDOWN_DURATION = 10;

// Slider elements
const slider = document.querySelector('.dual-slider');
const track = document.querySelector('.dual-slider-track');
const handle = document.querySelector('.dual-slider-handle');
const rangeStatus = document.getElementById('range-status');

function getCommitCountFromSlider() {
  // Map sliderPos (0-1) to commit count (10 to 500)
  return Math.max(10, Math.round(10 + (sliderPos * 490)));
}

function updateSliderUI() {
  const visibleWidth = (1 - sliderPos) * 100;
  track.style.left = `${sliderPos * 100}%`;
  track.style.right = '0%';
  handle.style.left = `${sliderPos * 100}%`;
  
  if (sliderPos > 0.01) {
    rangeStatus.style.opacity = '1';
  } else {
    rangeStatus.style.opacity = '0';
  }
}

function updateSliderLabel() {
  const count = getCommitCountFromSlider();
  document.getElementById('range-start-label').textContent = `Analysis Depth: ${count} commits`;
}

function getSliderPos(e) {
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const rect = slider.getBoundingClientRect();
  const x = clientX - rect.left;
  return Math.max(0, Math.min(1, x / rect.width));
}

// Slider events — NO dependency on allCommits
function handleDragMove(e) {
  if (!isDragging) return;
  sliderPos = getSliderPos(e);
  updateSliderUI();
  updateSliderLabel();
}

function handleDragEnd() {
  if (!isDragging) return;
  isDragging = false;
}

function onMouseMove(e) { handleDragMove(e); }
function onMouseUp() { handleDragEnd(); }
function onTouchMove(e) { handleDragMove(e); }
function onTouchEnd() { handleDragEnd(); }

handle.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isDragging = true;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp, { once: true });
});

handle.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  isDragging = true;
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('touchend', onTouchEnd, { once: true });
});

// Click-to-jump on slider track
slider.addEventListener('click', (e) => {
  if (e.target.classList.contains('dual-slider-handle')) return;
  sliderPos = getSliderPos(e);
  updateSliderUI();
  updateSliderLabel();
});

// Pagination
function renderPagination() {
  const totalCommits = allCommits.length;
  const totalPages = Math.max(1, Math.ceil(totalCommits / COMMITS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);
  
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  
  const startIdx = (currentPage - 1) * COMMITS_PER_PAGE;
  const endIdx = Math.min(currentPage * COMMITS_PER_PAGE - 1, totalCommits - 1);
  return { startIdx, endIdx };
}

function renderCommitTable() {
  if (!allCommits.length) return;
  const { startIdx, endIdx } = renderPagination();
  const visible = allCommits.slice(startIdx, endIdx + 1);
  while (table.firstChild) table.removeChild(table.firstChild);
  visible.forEach(commit => renderCommit(commit));
  document.getElementById('logs-count').textContent = `Logs: ${visible.length} entries (${startIdx + 1}-${endIdx + 1})`;
}

// Pagination controls
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderCommitTable();
  }
});

nextBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(allCommits.length / COMMITS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderCommitTable();
  }
});

// Loading overlay
function showLoading(text) {
  loadingText.textContent = text;
  loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// Toast
function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.pointerEvents = 'auto';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.pointerEvents = 'none';
  }, duration);
}

// Cooldown
function startCooldown() {
  cooldownSeconds = COOLDOWN_DURATION;
  decodeBtn.disabled = true;
  decodeBtn.classList.add('opacity-50', 'cursor-not-allowed');
  
  function tick() {
    if (cooldownSeconds > 0) {
      decodeBtn.textContent = `Decoding... ${cooldownSeconds}s `;
      const span = document.createElement('span');
      span.className = 'text-lg leading-none';
      span.textContent = '⚡';
      decodeBtn.appendChild(span);
      cooldownSeconds--;
      cooldownTimer = setTimeout(tick, 1000);
    } else {
      endCooldown();
    }
  }
  tick();
}

function endCooldown() {
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = null;
  cooldownSeconds = 0;
  decodeBtn.disabled = false;
  decodeBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  decodeBtn.textContent = 'Initialize_Decoding ';
  const span = document.createElement('span');
  span.className = 'text-lg leading-none';
  span.textContent = '⚡';
  decodeBtn.appendChild(span);
}

// Helpers
function formatNumber(num) {
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return num.toString();
}

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s Ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m Ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h Ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d Ago`;
}

function getAreaLabel(message) {
  const m = message.toLowerCase();
  const areas = [
    { label: 'UI', keywords: ['ui', 'interface', 'css', 'layout', 'styling', 'design', 'react', 'component', 'theme', 'style', 'frontend', 'tailwind', 'sass', 'scss', 'html', 'markup', 'svg', 'icon'] },
    { label: 'API', keywords: ['api', 'endpoint', 'route', 'rest', 'graphql', 'middleware', 'controller', 'swagger', 'openapi', 'rpc', 'grpc'] },
    { label: 'Test', keywords: ['test', 'spec', 'jest', 'cypress', 'e2e', 'coverage', 'assert', 'mocha', 'vitest', 'playwright', 'unit', 'integration'] },
    { label: 'Core', keywords: ['core', 'engine', 'foundation', 'base', 'system', 'kernel', 'architecture', 'framework', 'platform', 'runtime'] },
    { label: 'Auth', keywords: ['auth', 'login', 'security', 'oauth', 'token', 'jwt', 'session', 'permission', 'rbac', 'sso', 'password', 'crypt', 'hash', 'encrypt'] },
    { label: 'DB', keywords: ['db', 'database', 'sql', 'migration', 'schema', 'model', 'query', 'mongo', 'redis', 'postgres', 'mysql', 'sqlite', 'orm', 'sequelize', 'prisma'] },
    { label: 'Fix', keywords: ['fix', 'bug', 'patch', 'hotfix', 'issue', 'crash', 'error', 'repair', 'resolve', 'correct', 'broken', 'regression'] },
    { label: 'Feat', keywords: ['feat', 'feature', 'add', 'new', 'implement', 'introduce', 'support', 'enable', 'create', 'generate', 'attach', 'append'] },
    { label: 'Ref', keywords: ['refactor', 'clean', 'restructure', 'rewrite', 'simplify', 'cleanup', 'debt', 'dry', 'extract', 'move', 'rename', 'organize'] },
    { label: 'Perf', keywords: ['perf', 'optimize', 'speed', 'performance', 'latency', 'memory', 'cache', 'buffer', 'bottleneck', 'load', 'fast', 'slow', 'lazy', 'preload', 'defer'] },
    { label: 'Build', keywords: ['build', 'webpack', 'config', 'rollup', 'babel', 'lint', 'tsconfig', 'vite', 'esbuild', 'dockerfile', 'makefile', 'cmake', 'gradle', 'maven'] },
    { label: 'CI', keywords: ['ci', 'workflow', 'pipeline', 'deploy', 'deployment', 'release', 'github action', 'travis', 'jenkins', 'circleci', 'gitlab', 'cd', 'publish'] },
    { label: 'Docs', keywords: ['doc', 'readme', 'comment', 'documentation', 'wiki', 'guide', 'changelog', 'manual', 'tutorial', 'faq', 'license', 'typo', 'grammar'] },
    { label: 'Backend', keywords: ['server', 'backend', 'node', 'express', 'microservice', 'lambda', 'function', 'worker', 'queue', 'cron', 'job', 'handler', 'service'] },
    { label: 'Deps', keywords: ['deps', 'dependency', 'package', 'npm', 'upgrade', 'bump', 'version', 'yarn', 'pnpm', 'lock', 'vendor', 'lib', 'sdk', 'install'] },
    { label: 'Mobile', keywords: ['mobile', 'ios', 'android', 'swift', 'kotlin', 'react native', 'flutter', 'cordova', 'capacitor', 'pwa', 'app', 'apk', 'ipa'] },
    { label: 'Dev', keywords: ['dev', 'tool', 'script', 'cli', 'utility', 'helper', 'plugin', 'extension', 'debug', 'log', 'trace', 'mock', 'stub', 'fixture', 'seed'] },
    { label: 'Change', keywords: ['update', 'upgrade', 'modify', 'change', 'edit', 'adjust', 'tweak', 'improve', 'enhance', 'polish', 'revert', 'rollback', 'merge', 'sync', 'rebase', 'cherry-pick'] }
  ];
  for (const area of areas) {
    if (area.keywords.some(k => m.includes(k))) return area.label;
  }
  return 'Change';
}

function getAreaColor(area) {
  const map = {
    UI: '#ec4899',
    API: '#8b5cf6',
    Test: '#f59e0b',
    Core: '#7c3aed',
    Auth: '#ef4444',
    DB: '#10b981',
    Fix: '#f97316',
    Feat: '#3b82f6',
    Ref: '#06b6d4',
    Perf: '#14b8a6',
    Build: '#6b7280',
    CI: '#a78bfa',
    Docs: '#84cc16',
    Backend: '#6366f1',
    Deps: '#d946ef',
    Mobile: '#f43f5e',
    Dev: '#0ea5e9',
    Change: '#9ca3af'
  };
  return map[area] || '#9ca3af';
}

function generateCommitSummary(message) {
  const lines = message.split('\n');
  const title = lines[0];
  const body = lines.slice(1).join('\n').trim();
  
  const match = title.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.*)$/);
  if (!match) {
    return { summary: title, body: body };
  }
  
  const type = match[1].toLowerCase();
  const scope = match[2];
  const desc = match[3];
  
  const actionMap = {
    feat: 'Added',
    fix: 'Fixed',
    docs: 'Updated documentation for',
    refactor: 'Refactored',
    test: 'Added tests for',
    chore: 'Updated',
    style: 'Improved styling of',
    perf: 'Optimized',
    build: 'Updated build configuration for',
    ci: 'Updated CI/CD for',
    init: 'Initialized',
    add: 'Added',
    remove: 'Removed',
    delete: 'Deleted',
    update: 'Updated',
    bump: 'Bumped',
    merge: 'Merged',
    revert: 'Reverted'
  };
  
  const action = actionMap[type] || 'Updated';
  const scopeText = scope ? ` in ${scope}` : '';
  const summary = `${action} ${desc}${scopeText}.`;
  
  return { summary, body };
}

function renderCommit(commit) {
  const author = commit.commit.author.name;
  const message = commit.commit.message;
  const sha = commit.sha.substring(0, 7);
  const date = commit.commit.author.date;
  const area = getAreaLabel(message);
  const color = getAreaColor(area);
  const { summary, body } = generateCommitSummary(message);
  
  const hasBody = body && body.length > 10;
  const summaryId = `summary-${sha}`;
  
  const card = document.createElement('div');
  card.className = 'commit-row bg-[#050505] w-full flex flex-row items-start justify-between p-4 gap-4 border-l border-transparent hover:border-l-[#7c3aed] hover:bg-[#0e0e0e] transition-colors cursor-pointer';
  
  const shaP = document.createElement('p');
  shaP.className = 'font-mono text-xs text-[#7c3aed] uppercase tracking-wider min-w-[70px] pt-0.5 flex-shrink-0';
  shaP.textContent = `#${sha}`;
  card.appendChild(shaP);
  
  const flexCol = document.createElement('div');
  flexCol.className = 'flex-1 flex flex-col gap-1 min-w-0 overflow-hidden';
  
  const headerRow = document.createElement('div');
  headerRow.className = 'flex flex-row items-center gap-3 min-w-0';
  
  const areaSpan = document.createElement('span');
  areaSpan.className = 'text-[10px] font-mono uppercase tracking-wider font-bold flex-shrink-0';
  areaSpan.style.color = color;
  areaSpan.textContent = area;
  headerRow.appendChild(areaSpan);
  
  const titleP = document.createElement('p');
  titleP.className = 'text-sm font-sans text-white truncate';
  titleP.textContent = commit.commit.message.split('\n')[0];
  headerRow.appendChild(titleP);
  
  flexCol.appendChild(headerRow);
  
  const summaryP = document.createElement('p');
  summaryP.className = 'text-xs font-mono text-gray-400 leading-relaxed';
  summaryP.textContent = summary;
  flexCol.appendChild(summaryP);
  
  if (hasBody) {
    const bodyDiv = document.createElement('div');
    bodyDiv.id = summaryId;
    bodyDiv.className = 'hidden mt-1';
    
    const bodyP = document.createElement('p');
    bodyP.className = 'text-[10px] font-mono text-gray-500 leading-relaxed whitespace-pre-wrap';
    bodyP.textContent = body;
    bodyDiv.appendChild(bodyP);
    flexCol.appendChild(bodyDiv);
    
    const readMoreBtn = document.createElement('button');
    readMoreBtn.className = 'read-more text-[10px] font-mono text-[#7c3aed] hover:text-white transition-colors mt-1 text-left';
    readMoreBtn.textContent = 'Read more';
    readMoreBtn.addEventListener('click', function() {
      bodyDiv.classList.toggle('hidden');
      this.textContent = bodyDiv.classList.contains('hidden') ? 'Read more' : 'Show less';
    });
    flexCol.appendChild(readMoreBtn);
  }
  
  card.appendChild(flexCol);
  
  const rightCol = document.createElement('div');
  rightCol.className = 'flex flex-col items-end gap-1 min-w-[80px] flex-shrink-0';
  
  const timeP = document.createElement('p');
  timeP.className = 'text-xs font-mono text-gray-500 uppercase';
  timeP.textContent = timeAgo(date);
  rightCol.appendChild(timeP);
  
  const authorP = document.createElement('p');
  authorP.className = 'text-xs font-mono text-gray-400';
  authorP.textContent = `@${author}`;
  rightCol.appendChild(authorP);
  
  card.appendChild(rightCol);
  
  table.appendChild(card);
}

function runTypewriter(el) {
  const text = el.textContent;
  el.textContent = '';
  el.style.display = 'inline-block';
  let i = 0;
  const speed = 15;
  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      el.classList.add('cursor-blink');
    }
  }
  setTimeout(type, 500);
}

function renderSummary(result) {
  const summaryField = document.getElementById('summaryField');
  while (summaryField.firstChild) summaryField.removeChild(summaryField.firstChild);
  summaryField.className = 'border-l-2 border-[#7c3aed] pl-4';
  const p = document.createElement('p');
  p.className = 'text-xs font-mono text-gray-400 leading-relaxed typewriter-text';
  p.textContent = result;
  summaryField.appendChild(p);
  runTypewriter(p);
}

async function fetchCommitsPaginated(baseUrl, count) {
  const all = [];
  let page = 1;
  const perPage = 100;
  
  while (all.length < count) {
    const remaining = count - all.length;
    const currentPerPage = Math.min(perPage, remaining);
    const result = await safeFetch(
      `${baseUrl}/commits?per_page=${currentPerPage}&page=${page}`,
      `commits-page-${page}`
    );
    if (!result.ok) return result;
    if (!Array.isArray(result.data) || result.data.length === 0) break;
    
    all.push(...result.data);
    if (result.data.length < currentPerPage) break;
    page++;
  }
  return { ok: true, data: all, headers: null };
}

async function safeFetch(url, label) {
  try {
    // Replace direct GitHub API calls with backend proxy
    // The backend adds the GitHub token and handles authentication
    const proxyUrl = url.replace('https://api.github.com', `${API_BASE}/api/github`);
    
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.error(`[${label}] HTTP ${res.status}: ${res.statusText}`);
      if (res.status === 403) {
        return { ok: false, status: 403, data: null, rateLimited: true };
      }
      return { ok: false, status: res.status, data: null };
    }
    const data = await res.json();
    return { ok: true, data, headers: res.headers };
  } catch (err) {
    console.error(`[${label}] Network error:`, err);
    return { ok: false, data: null };
  }
}

// Main decode handler
document.getElementById('decode').addEventListener('click', async () => {
  const repoURL = document.getElementById('url-input').value.trim();
  if (!repoURL) {
    alert('Please enter a GitHub repository URL.');
    return;
  }

  if (cooldownSeconds > 0) {
    showToast(`Backend is processing. Please wait ${cooldownSeconds}s.`, 2000);
    return;
  }

  const replacedURL = repoURL.replace('https://github.com/', '').replace(/\/$/, '');
  const [owner, repo] = replacedURL.split('/');
  if (!owner || !repo) {
    alert('Invalid URL format. Expected: https://github.com/owner/repo');
    return;
  }
  const cleanRepo = repo.replace('.git', '');
  const commitCount = getCommitCountFromSlider();
  console.log(`Decoding ${owner}/${cleanRepo} (fetching ${commitCount} commits)`);

  startCooldown();
  showLoading('Decoding Repository...');

  const base = `https://api.github.com/repos/${owner}/${cleanRepo}`;
  const [commits, meta, lang, contrib, tags, activity] = await Promise.all([
    fetchCommitsPaginated(base, commitCount),
    safeFetch(`${base}`, 'meta'),
    safeFetch(`${base}/languages`, 'languages'),
    safeFetch(`${base}/contributors?per_page=5`, 'contributors'),
    safeFetch(`${base}/tags?per_page=1`, 'tags'),
    safeFetch(`${base}/stats/commit_activity`, 'activity')
  ]);

  // Check for rate limiting
  if (commits.rateLimited || meta.rateLimited) {
    hideLoading();
    endCooldown();
    showToast('GitHub API rate limit reached (403). Please wait a few minutes before trying again.', 6000);
    alert('GitHub API rate limit reached. You can only make ~60 unauthenticated requests per hour. Please wait a few minutes.');
    return;
  }

  if (!commits.ok) {
    hideLoading();
    endCooldown();
    alert(`Failed to fetch commits. GitHub responded: ${commits.status || 'Network Error'}. Check the URL or try again later.`);
    return;
  }

  allCommits = commits.data;

  // Update Protocol Summary
  document.getElementById('total-commits').textContent = allCommits.length;
  document.getElementById('authors-count').textContent = (contrib.ok && contrib.data.length) || '--';
  document.getElementById('latest-tag').textContent = (tags.ok && tags.data[0]?.name) || 'N/A';

  // Update Repo Metadata
  if (meta.ok) {
    document.getElementById('repo-name').textContent = meta.data.full_name || `${owner}/${cleanRepo}`;
    document.getElementById('repo-stars').textContent = `★ ${formatNumber(meta.data.stargazers_count || 0)}`;
    document.getElementById('repo-forks').textContent = `⑂ ${formatNumber(meta.data.forks_count || 0)}`;
  }

  // Update Languages
  if (lang.ok && Object.keys(lang.data).length > 0) {
    const totalBytes = Object.values(lang.data).reduce((a, b) => a + b, 0);
    const languages = Object.entries(lang.data)
      .sort((a, b) => b[1] - a[1])
      .map(([name, bytes]) => ({ name, pct: (bytes / totalBytes) * 100 }));
    const langBar = document.getElementById('lang-bar');
    const langLegend = document.getElementById('lang-legend');
    const langColors = ['#7c3aed', '#a78bfa', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];
    while (langBar.firstChild) langBar.removeChild(langBar.firstChild);
    while (langLegend.firstChild) langLegend.removeChild(langLegend.firstChild);
    languages.forEach((l, i) => {
      const fill = document.createElement('div');
      fill.className = 'lang-fill';
      fill.style.width = `${l.pct}%`;
      fill.style.background = langColors[i % langColors.length];
      langBar.appendChild(fill);
      const legendItem = document.createElement('span');
      legendItem.className = 'flex items-center gap-1';
      const dot = document.createElement('span');
      dot.className = 'w-1.5 h-1.5 inline-block';
      dot.style.background = langColors[i % langColors.length];
      legendItem.appendChild(dot);
      legendItem.appendChild(document.createTextNode(` ${l.name} (${l.pct.toFixed(1)}%)`));
      langLegend.appendChild(legendItem);
    });
  }

  // Update Contributors
  if (contrib.ok && contrib.data.length > 0) {
    const contributorsList = document.getElementById('contributors-list');
    while (contributorsList.firstChild) contributorsList.removeChild(contributorsList.firstChild);
    const top3 = contrib.data.slice(0, 3);
    top3.forEach(c => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between';

      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center gap-2';

      const avatarDiv = document.createElement('div');
      avatarDiv.className = 'w-5 h-5 bg-[#0e0e0e] border border-white/10 overflow-hidden';
      if (c.avatar_url) {
        const img = document.createElement('img');
        img.src = c.avatar_url;
        img.className = 'w-full h-full object-cover';
        img.alt = '';
        avatarDiv.appendChild(img);
      }
      leftDiv.appendChild(avatarDiv);

      const loginSpan = document.createElement('span');
      loginSpan.className = 'text-xs font-mono text-white';
      loginSpan.textContent = c.login || 'unknown';
      leftDiv.appendChild(loginSpan);

      div.appendChild(leftDiv);

      const contribSpan = document.createElement('span');
      contribSpan.className = 'text-[10px] font-mono text-[#7c3aed]';
      contribSpan.textContent = `${c.contributions} commits`;
      div.appendChild(contribSpan);

      contributorsList.appendChild(div);
    });
  }

  // Update Activity Chart
  const barChart = document.getElementById('bar-chart');
  if (activity.ok && activity.data.length > 0) {
    while (barChart.firstChild) barChart.removeChild(barChart.firstChild);
    const last7 = activity.data.slice(-7);
    const maxTotal = Math.max(...last7.map(w => w.total), 1);
    last7.forEach((week) => {
      const bar = document.createElement('div');
      bar.className = 'bar';
      const pct = (week.total / maxTotal) * 100;
      bar.style.height = `${pct}%`;
      if (week.total === maxTotal && week.total > 0) bar.classList.add('active');
      barChart.appendChild(bar);
    });
  } else {
    // Show empty state when no activity data available
    while (barChart.firstChild) barChart.removeChild(barChart.firstChild);
    const noDataDiv = document.createElement('div');
    noDataDiv.className = 'flex items-center justify-center w-full h-full text-[10px] font-mono text-gray-500 uppercase tracking-wider';
    noDataDiv.textContent = 'No data yet';
    barChart.appendChild(noDataDiv);
  }

  // Render table
  currentPage = 1;
  renderCommitTable();
  hideLoading();

  // AI Summary
  const summaryCommit = allCommits
    .slice(0, 20)
    .map(c => c.commit.message.split('\n')[0].substring(0, 100));
  
  showLoading('Generating Summary...');
  
  try {
    const res = await fetch(`${API_BASE}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoName: `${owner}/${cleanRepo}`, commits: summaryCommit })
    });
    
    if (res.ok) {
      const result = await res.json();
      if (result.summary && result.summary.trim().length > 0) {
        renderSummary(result.summary);
        consecutiveErrors = 0;
      } else {
        consecutiveErrors++;
        renderSummary('Backend had an oopsie. Please try again later! x0x0');
      }
    } else {
      consecutiveErrors++;
      if (consecutiveErrors >= 2) {
        showToast('Backend is overloaded. Please wait 30s before trying again.', 5000);
        endCooldown();
      }
      renderSummary('Backend had an oopsie. Please try again later! x0x0');
    }
  } catch (err) {
    console.error('Summarizer error:', err);
    consecutiveErrors++;
    if (consecutiveErrors >= 2) {
      showToast('Backend is overloaded. Please wait 30s before trying again.', 5000);
      endCooldown();
    }
    renderSummary('Backend had an oopsie. Please try again later! x0x0');
  }
  
  hideLoading();
});

// New Analysis reset
document.getElementById('new-analysis').addEventListener('click', () => {
  document.getElementById('url-input').value = '';
  allCommits = [];
  sliderPos = 0;
  currentPage = 1;
  consecutiveErrors = 0;
  updateSliderUI();
  updateSliderLabel();
  endCooldown();

  while (table.firstChild) table.removeChild(table.firstChild);
  const placeholder = document.createElement('div');
  placeholder.id = 'table-placeholder';
  placeholder.className = 'commit-row bg-[#050505] w-full flex flex-row items-center justify-center p-4 text-xs font-mono text-gray-500 uppercase tracking-wider';
  placeholder.textContent = 'Awaiting_Input // No_Data';
  table.appendChild(placeholder);

  const summaryField = document.getElementById('summaryField');
  while (summaryField.firstChild) summaryField.removeChild(summaryField.firstChild);
  const defaultP = document.createElement('p');
  defaultP.className = 'text-xs font-mono text-gray-400 leading-relaxed typewriter-text';
  defaultP.textContent = "Branch 'main' exhibits high commit density with localized fragmentation in the core/stream module. Architecture remains stable despite recent merge volatility.";
  summaryField.appendChild(defaultP);

  ['total-commits', 'authors-count', 'latest-tag'].forEach(id => {
    document.getElementById(id).textContent = '--';
  });
  document.getElementById('repo-name').textContent = 'Gitly/Core';
  document.getElementById('repo-stars').textContent = '★ --';
  document.getElementById('repo-forks').textContent = '⑂ --';

  const langBarEl = document.getElementById('lang-bar');
  while (langBarEl.firstChild) langBarEl.removeChild(langBarEl.firstChild);
  const langLegendEl = document.getElementById('lang-legend');
  while (langLegendEl.firstChild) langLegendEl.removeChild(langLegendEl.firstChild);

  const contribList = document.getElementById('contributors-list');
  while (contribList.firstChild) contribList.removeChild(contribList.firstChild);
  const contribPlaceholder = document.createElement('div');
  contribPlaceholder.className = 'flex items-center justify-between';
  const contribLeft = document.createElement('div');
  contribLeft.className = 'flex items-center gap-2';
  const contribAvatar = document.createElement('div');
  contribAvatar.className = 'w-5 h-5 bg-[#0e0e0e] border border-white/10';
  const contribName = document.createElement('span');
  contribName.className = 'text-xs font-mono text-white';
  contribName.textContent = '--';
  contribLeft.appendChild(contribAvatar);
  contribLeft.appendChild(contribName);
  const contribRight = document.createElement('span');
  contribRight.className = 'text-[10px] font-mono text-[#7c3aed]';
  contribRight.textContent = '-- commits';
  contribPlaceholder.appendChild(contribLeft);
  contribPlaceholder.appendChild(contribRight);
  contribList.appendChild(contribPlaceholder);

  const barChartEl = document.getElementById('bar-chart');
  while (barChartEl.firstChild) barChartEl.removeChild(barChartEl.firstChild);
  for (let i = 0; i < 7; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = '0%';
    barChartEl.appendChild(bar);
  }
  document.getElementById('logs-count').textContent = 'Logs: -- entries';
  document.getElementById('range-start-label').textContent = 'Analysis Depth: 10 commits';
  rangeStatus.style.opacity = '0';
  pageInfo.textContent = 'Page 1 of 1';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
});

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize slider
  updateSliderUI();
  updateSliderLabel();
  
  const typewriterElements = document.querySelectorAll('.typewriter-text');
  typewriterElements.forEach(el => runTypewriter(el));

  const logEntries = document.querySelectorAll('.log-entry');
  logEntries.forEach((entry, index) => {
    entry.style.animationDelay = `${index * 0.1}s`;
  });

  const sidebarButtons = document.querySelectorAll('#left-btns button');
  sidebarButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sidebarButtons.forEach(b => {
        b.classList.remove('sidebar-active');
        b.classList.remove('bg-surface');
        b.classList.remove('text-white');
        b.classList.add('bg-transparent');
        b.classList.add('text-gray-400');
      });
      btn.classList.add('sidebar-active');
      btn.classList.add('bg-surface');
      btn.classList.add('text-white');
      btn.classList.remove('bg-transparent');
      btn.classList.remove('text-gray-400');
    });
  });
});
