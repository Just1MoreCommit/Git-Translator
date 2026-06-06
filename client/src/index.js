require('./style.css');

console.log('Gitly app loaded');

const table = document.getElementById('table');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');

// State
let allCommits = [];
let sliderState = { start: 0, end: 1 };
let isDragging = null;
let currentPage = 1;
const COMMITS_PER_PAGE = 100;

// Slider elements
const slider = document.querySelector('.dual-slider');
const track = document.querySelector('.dual-slider-track');
const handleLeft = document.querySelector('.dual-slider-handle.left');
const handleRight = document.querySelector('.dual-slider-handle.right');

function updateSliderUI() {
  track.style.left = `${sliderState.start * 100}%`;
  track.style.right = `${(1 - sliderState.end) * 100}%`;
  handleLeft.style.left = `${sliderState.start * 100}%`;
  handleRight.style.right = `${(1 - sliderState.end) * 100}%`;
}

function getSliderPos(e) {
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const rect = slider.getBoundingClientRect();
  const x = clientX - rect.left;
  return Math.max(0, Math.min(1, x / rect.width));
}

function updateSliderLabels() {
  if (!allCommits.length) return;
  const N = allCommits.length;
  const from = Math.floor((1 - sliderState.end) * (N - 1));
  const to = Math.floor((1 - sliderState.start) * (N - 1));
  const startSha = allCommits[to]?.sha?.substring(0, 7) || '0x0000';
  const endSha = allCommits[from]?.sha?.substring(0, 7) || '0x0000';
  document.getElementById('range-start-label').textContent = `Commit_Range_Start: ${startSha}`;
  document.getElementById('range-end-label').textContent = `Commit_Range_End: ${endSha}`;
}

function getSliderRange() {
  if (!allCommits.length) return { start: 0, end: 0 };
  const N = allCommits.length;
  const from = Math.floor((1 - sliderState.end) * (N - 1));
  const to = Math.floor((1 - sliderState.start) * (N - 1));
  return { start: Math.min(from, to), end: Math.max(from, to) };
}

function renderPagination() {
  const range = getSliderRange();
  const totalInRange = range.end - range.start + 1;
  const totalPages = Math.max(1, Math.ceil(totalInRange / COMMITS_PER_PAGE));
  currentPage = Math.min(currentPage, totalPages);
  
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  
  return { startIdx: range.start + (currentPage - 1) * COMMITS_PER_PAGE, endIdx: Math.min(range.start + currentPage * COMMITS_PER_PAGE - 1, range.end) };
}

function renderCommitTable() {
  if (!allCommits.length) return;
  const { startIdx, endIdx } = renderPagination();
  const visible = allCommits.slice(startIdx, endIdx + 1);
  table.innerHTML = '';
  visible.forEach(commit => renderCommit(commit));
  document.getElementById('logs-count').textContent = `Logs: ${visible.length} entries (${startIdx + 1}-${endIdx + 1})`;
}

function handleDragMove(e) {
  if (!isDragging || !allCommits.length) return;
  const pos = getSliderPos(e);
  if (isDragging === 'left') {
    sliderState.start = Math.min(pos, sliderState.end - 0.02);
  } else {
    sliderState.end = Math.max(pos, sliderState.start + 0.02);
  }
  updateSliderUI();
  updateSliderLabels();
}

function handleDragEnd() {
  if (!isDragging) return;
  isDragging = null;
  currentPage = 1;
  renderCommitTable();
}

// Slider events
function onMouseMove(e) { handleDragMove(e); }
function onMouseUp() { handleDragEnd(); }
function onTouchMove(e) { handleDragMove(e); }
function onTouchEnd() { handleDragEnd(); }

handleLeft.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isDragging = 'left';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp, { once: true });
});

handleRight.addEventListener('mousedown', (e) => {
  e.stopPropagation();
  isDragging = 'right';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp, { once: true });
});

handleLeft.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  isDragging = 'left';
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('touchend', onTouchEnd, { once: true });
});

handleRight.addEventListener('touchstart', (e) => {
  e.stopPropagation();
  isDragging = 'right';
  document.addEventListener('touchmove', onTouchMove);
  document.addEventListener('touchend', onTouchEnd, { once: true });
});

// Click-to-jump on slider track
slider.addEventListener('click', (e) => {
  if (e.target.classList.contains('dual-slider-handle')) return;
  if (!allCommits.length) return;
  const pos = getSliderPos(e);
  const distLeft = Math.abs(pos - sliderState.start);
  const distRight = Math.abs(pos - sliderState.end);
  if (distLeft < distRight) {
    sliderState.start = Math.min(pos, sliderState.end - 0.02);
  } else {
    sliderState.end = Math.max(pos, sliderState.start + 0.02);
  }
  updateSliderUI();
  updateSliderLabels();
  currentPage = 1;
  renderCommitTable();
});

// Pagination controls
prevBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderCommitTable();
  }
});

nextBtn.addEventListener('click', () => {
  const range = getSliderRange();
  const totalPages = Math.ceil((range.end - range.start + 1) / COMMITS_PER_PAGE);
  if (currentPage < totalPages) {
    currentPage++;
    renderCommitTable();
  }
});

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
  
  // Parse conventional commit
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
  card.innerHTML = `
    <p class="font-mono text-xs text-[#7c3aed] uppercase tracking-wider min-w-[70px] pt-0.5 flex-shrink-0">#${sha}</p>
    <div class="flex-1 flex flex-col gap-1 min-w-0 overflow-hidden">
      <div class="flex flex-row items-center gap-3 min-w-0">
        <span class="text-[10px] font-mono uppercase tracking-wider font-bold flex-shrink-0" style="color:${color}">${area}</span>
        <p class="text-sm font-sans text-white truncate">${commit.commit.message.split('\n')[0]}</p>
      </div>
      <p class="text-xs font-mono text-gray-400 leading-relaxed">${summary}</p>
      ${hasBody ? `<div id="${summaryId}" class="hidden mt-1"><p class="text-[10px] font-mono text-gray-500 leading-relaxed whitespace-pre-wrap">${body}</p></div>
      <button class="read-more text-[10px] font-mono text-[#7c3aed] hover:text-white transition-colors mt-1 text-left" onclick="this.previousElementSibling.classList.toggle('hidden'); this.textContent = this.previousElementSibling.classList.contains('hidden') ? 'Read more' : 'Show less'">Read more</button>` : ''}
    </div>
    <div class="flex flex-col items-end gap-1 min-w-[80px] flex-shrink-0">
      <p class="text-xs font-mono text-gray-500 uppercase">${timeAgo(date)}</p>
      <p class="text-xs font-mono text-gray-400">@${author}</p>
    </div>
  `;
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
  summaryField.innerHTML = '';
  summaryField.className = 'border-l-2 border-[#7c3aed] pl-4';
  const p = document.createElement('p');
  p.className = 'text-xs font-mono text-gray-400 leading-relaxed typewriter-text';
  p.textContent = result;
  summaryField.appendChild(p);
  runTypewriter(p);
}

async function safeFetch(url, label) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[${label}] HTTP ${res.status}: ${res.statusText}`);
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

  const replacedURL = repoURL.replace('https://github.com/', '');
  const [owner, repo] = replacedURL.split('/');
  if (!owner || !repo) {
    alert('Invalid URL format. Expected: https://github.com/owner/repo');
    return;
  }
  const cleanRepo = repo.replace('.git', '');

  console.log(`Decoding ${owner}/${cleanRepo}`);

  const base = `https://api.github.com/repos/${owner}/${cleanRepo}`;

  const [commits, meta, lang, contrib, tags, activity, totalCommits] = await Promise.all([
    safeFetch(`${base}/commits?per_page=100`, 'commits'),
    safeFetch(`${base}`, 'meta'),
    safeFetch(`${base}/languages`, 'languages'),
    safeFetch(`${base}/contributors?per_page=5`, 'contributors'),
    safeFetch(`${base}/tags?per_page=1`, 'tags'),
    safeFetch(`${base}/stats/commit_activity`, 'activity'),
    safeFetch(`${base}/commits?per_page=1`, 'totalCommits')
  ]);

  if (!commits.ok) {
    alert(`Failed to fetch commits. GitHub responded: ${commits.status || 'Network Error'}. Check the URL or try again later.`);
    return;
  }

  allCommits = commits.data;

  // Total commits from Link header
  let totalCommitCount = allCommits.length;
  if (totalCommits.ok && totalCommits.headers) {
    const link = totalCommits.headers.get('Link');
    console.log('[totalCommits] Link header:', link);
    if (link) {
      const allPages = [...link.matchAll(/page=(\d+)/g)];
      if (allPages.length > 0) {
        totalCommitCount = parseInt(allPages[allPages.length - 1][1]);
        console.log('[totalCommits] Parsed total:', totalCommitCount);
      }
    }
  }
  if (totalCommitCount === 100 && allCommits.length === 100) {
    totalCommitCount = '100+';
  }

  // Update Protocol Summary
  document.getElementById('total-commits').textContent = totalCommitCount;
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
    langBar.innerHTML = '';
    langLegend.innerHTML = '';
    languages.forEach((l, i) => {
      const fill = document.createElement('div');
      fill.className = 'lang-fill';
      fill.style.width = `${l.pct}%`;
      fill.style.background = langColors[i % langColors.length];
      langBar.appendChild(fill);
      const legendItem = document.createElement('span');
      legendItem.className = 'flex items-center gap-1';
      legendItem.innerHTML = `<span class="w-1.5 h-1.5 inline-block" style="background:${langColors[i % langColors.length]}"></span> ${l.name} (${l.pct.toFixed(1)}%)`;
      langLegend.appendChild(legendItem);
    });
  }

  // Update Contributors
  if (contrib.ok && contrib.data.length > 0) {
    const contributorsList = document.getElementById('contributors-list');
    contributorsList.innerHTML = '';
    const top3 = contrib.data.slice(0, 3);
    top3.forEach(c => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between';
      div.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-5 h-5 bg-[#0e0e0e] border border-white/10 overflow-hidden">
            ${c.avatar_url ? `<img src="${c.avatar_url}" class="w-full h-full object-cover" alt="">` : ''}
          </div>
          <span class="text-xs font-mono text-white">${c.login || 'unknown'}</span>
        </div>
        <span class="text-[10px] font-mono text-[#7c3aed]">${c.contributions} commits</span>
      `;
      contributorsList.appendChild(div);
    });
  }

  // Update Activity Chart
  if (activity.ok && activity.data.length > 0) {
    const barChart = document.getElementById('bar-chart');
    barChart.innerHTML = '';
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
  }

  // Initialize slider and render table
  sliderState = { start: 0, end: 1 };
  currentPage = 1;
  updateSliderUI();
  updateSliderLabels();
  renderCommitTable();

  // AI Summary: send only commits in the slider range
  const range = getSliderRange();
  const rangeCommits = allCommits.slice(range.start, range.end + 1);
  const summaryCommit = rangeCommits
    .slice(0, 20)
    .map(c => c.commit.message.split('\n')[0].substring(0, 100));
  
  try {
    const res = await fetch('https://git-translator-production.up.railway.app/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commits: summaryCommit })
    });
    if (res.ok) {
      const result = await res.json();
      renderSummary(result.summary);
    } else {
      console.error('Summarizer returned', res.status);
      renderSummary('Summary unavailable. AI summarizer returned an error.');
    }
  } catch (err) {
    console.error('Summarizer error:', err);
    renderSummary('Summary unavailable. AI summarizer service is offline.');
  }
});

// New Analysis reset
document.getElementById('new-analysis').addEventListener('click', () => {
  document.getElementById('url-input').value = '';
  allCommits = [];
  sliderState = { start: 0, end: 1 };
  currentPage = 1;
  updateSliderUI();
  updateSliderLabels();

  table.innerHTML = `
    <div id="table-placeholder" class="commit-row bg-[#050505] w-full flex flex-row items-center justify-center p-4 text-xs font-mono text-gray-500 uppercase tracking-wider">
      Awaiting_Input // No_Data
    </div>`;

  document.getElementById('summaryField').innerHTML = `
    <p class="text-xs font-mono text-gray-400 leading-relaxed typewriter-text">
      Branch 'main' exhibits high commit density with localized fragmentation in the
      core/stream module. Architecture remains stable despite recent merge volatility.
    </p>`;

  ['total-commits', 'authors-count', 'latest-tag'].forEach(id => {
    document.getElementById(id).textContent = '--';
  });
  document.getElementById('repo-name').textContent = 'Gitly/Core';
  document.getElementById('repo-stars').textContent = '★ --';
  document.getElementById('repo-forks').textContent = '⑂ --';
  document.getElementById('lang-bar').innerHTML = '';
  document.getElementById('lang-legend').innerHTML = '';
  document.getElementById('contributors-list').innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-5 h-5 bg-[#0e0e0e] border border-white/10"></div>
        <span class="text-xs font-mono text-white">--</span>
      </div>
      <span class="text-[10px] font-mono text-[#7c3aed]">-- commits</span>
    </div>`;
  document.getElementById('bar-chart').innerHTML = `
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>
    <div class="bar" style="height:0%"></div>`;
  document.getElementById('logs-count').textContent = 'Logs: -- entries';
  document.getElementById('range-start-label').textContent = 'Commit_Range_Start: 0x4f2a';
  document.getElementById('range-end-label').textContent = 'Commit_Range_End: HEAD';
  pageInfo.textContent = 'Page 1 of 1';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
});

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
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
