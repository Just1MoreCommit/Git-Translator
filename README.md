# Gitly — GitHub Repository Decoder & Summarizer

A focused tool for exploring GitHub repositories: fetches commits and metadata, classifies commit messages, visualizes activity, and generates a short human summary using the Google Generative Language (Gemini) API.

![Gitly UI screenshot](client/dist/Gitly.png)

Why Gitly?
- Turn raw Git history into readable insights in seconds.
- Helps maintainers and reviewers understand what changed and why.
- Lightweight frontend + secure backend proxy to avoid leaking tokens.

Table of contents
- Features
- Architecture
- Quickstart
- Configuration (env)
- API
- Usage
- Notes: caching & rate limits
- Development
- Contributing
- License & credits


Features
- Commit browsing with pagination and per-commit summaries
- Automatic classification of commit messages (UI, API, Fix, Docs, etc.)
- Language breakdown, top contributors and weekly activity chart
- AI-powered project summary (Gemini)
- Express backend proxy that injects a GitHub token and caches responses (in-memory, 5 min TTL)


Architecture (high level)
- Client (client/): Webpack + Tailwind CSS + vanilla JS. Renders the UI and calls the backend proxy instead of GitHub directly.
- Server (server/): Express proxy with two key routes:
  - GET /api/github/*  — forwards requests to api.github.com, attaches `Authorization: token <GITHUB_TOKEN>`, and caches results.
  - POST /summarize    — forwards commit messages to Google Gemini and returns a concise summary.
- In-memory cache (Map) with a 5-minute TTL to reduce GitHub requests and speed up repeated queries.


Quickstart (local)
Prereqs: Node.js 18+ (global fetch), npm

Clone
```bash
git clone https://github.com/Just1MoreCommit/Git-Translator.git
cd Git-Translator
```

Server (run locally)
```bash
cd server
npm install
# create server/.env (example below)
npm start
```

Client (build static bundle)
```bash
cd client
npm install
npm run build
# open client/dist/index.html or serve it: npx http-server client/dist -p 8080
```

Shortcut (repo root)
```bash
npm run build   # runs: cd client && npm install && npm run build
```

If running the server locally, update the API base in `client/src/index.js`:
```js
// client/src/index.js
const API_BASE = 'http://localhost:3000';
```
Then rebuild the client bundle.


Configuration (server/.env)
Create `server/.env` with:
```
GITHUB_TOKEN=ghp_xxx           # GitHub PAT to increase rate limits (recommended)
GEMINI_API_KEY=AIza...         # Google Generative Language (Gemini) key
PORT=3000                      # optional
```
Do NOT commit this file. The repo template already includes `server/.env` in .gitignore.


API reference
- GET /api/github/*
  - Proxy to GitHub. Example:
    GET /api/github/repos/{owner}/{repo}/commits?per_page=20
  - Link header (pagination) is forwarded.

- POST /summarize
  - Request: { "commits": ["msg1", "msg2", ...] }
  - Response: { "summary": "..." }

Examples
```bash
curl "http://localhost:3000/api/github/repos/octocat/Hello-World/commits?per_page=10"

curl -X POST http://localhost:3000/summarize \
  -H "Content-Type: application/json" \
  -d '{"commits":["Fix typo","Add login"]}'
```


Usage (UI)
1. Open the built site (client/dist/index.html) or run a static server.
2. Paste a GitHub repository URL (https://github.com/owner/repo).
3. Use the slider to limit how many commits are fetched (helps avoid rate limits).
4. Click "Initialize_Decoding". The app fetches commits, languages, contributors and activity.
5. A short, AI-generated summary appears after analysis. Commit rows show time, author and a short human-friendly summary.


Notes: caching & rate limits
- Server cache TTL: 5 minutes (in-memory Map). Cache key includes owner/repo and query string.
- Without a GitHub token, unauthenticated limits are ~60 requests/hour. Add GITHUB_TOKEN for higher limits.
- The client includes cooldown and UI hints when the backend is busy or rate-limited.


Development notes
- Client: `cd client && npm run dev` runs `webpack --watch` for iterative frontend work.
- Server: `cd server && npm start` (Node 18+ required).
- The frontend rewrites GitHub API URLs to `${API_BASE}/api/github/...` so tokens are kept on the server.


Contributing
- Open issues and PRs. Keep changes focused and include screenshots for UI changes.
- Run the client build locally before submitting UI changes.


Built with: Express, Tailwind CSS, Webpack, GitHub REST API. Summaries powered by Google Gemini.

