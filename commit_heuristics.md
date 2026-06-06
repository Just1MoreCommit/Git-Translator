# Gitly — Commit Message Summarization Heuristics

Client-side, regex-based commit summarization. No API calls. Patterns are ordered **most specific → most generic** so the first match wins.

> [!IMPORTANT]
> All regexes use the `i` flag (case-insensitive). The function should iterate top-to-bottom and **return on first match**.

---

## Heuristic Table

### 1 — Merges

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 1 | Merge pull request with number | `/^merge pull request #(\d+)\s+from\s+(.+)/i` | Merged | `Merge pull request #42 from user/feature-auth` | `Merged PR #42 from user/feature-auth.` |
| 2 | Merge pull request (no number) | `/^merge pull request\s+from\s+(.+)/i` | Merged | `Merge pull request from dev/login-fix` | `Merged PR from dev/login-fix.` |
| 3 | Merge branch into branch | `/^merge (?:branch\s+)?['"]?(.+?)['"]?\s+into\s+['"]?(.+?)['"]?$/i` | Merged | `Merge branch 'feature/api' into main` | `Merged feature/api into main.` |
| 4 | Merge branch (simple) | `/^merge (?:branch\s+)?['"]?(.+?)['"]?$/i` | Merged | `Merge branch 'develop'` | `Merged branch develop.` |
| 5 | Merge commit (hash) | `/^merge\s+([a-f0-9]{7,40})/i` | Merged | `Merge a1b2c3d` | `Merged commit a1b2c3d.` |

---

### 2 — Reverts

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 6 | Revert with quoted message | `/^revert\s+["'](.+?)["']/i` | Reverted | `Revert "Add dark mode toggle"` | `Reverted "Add dark mode toggle".` |
| 7 | Rollback to version | `/^rollback\s+to\s+v?(\S+)/i` | Rolled back | `Rollback to v2.1.0` | `Rolled back to v2.1.0.` |
| 8 | Revert / rollback / undo generic | `/^(?:revert\|rollback\|undo)\s+(.+)/i` | Reverted | `Undo last migration change` | `Reverted last migration change.` |

---

### 3 — Version Bumps & Releases

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 9 | Release version | `/^release\s+v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)$/i` | Released | `Release v3.0.0-beta.1` | `Released v3.0.0-beta.1.` |
| 10 | Bump to specific version | `/^bump\s+(?:version\s+)?(?:to\s+)?v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)$/i` | Bumped | `Bump version to 1.4.2` | `Bumped version to 1.4.2.` |
| 11 | Tag version | `/^tag\s+v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)$/i` | Tagged | `Tag v2.0.0` | `Tagged v2.0.0.` |
| 12 | Version in message (fallback) | `/^v?(\d+\.\d+\.\d+(?:[-\w.]*)?)$/i` | Released | `2.0.1` | `Released v2.0.1.` |

---

### 4 — Initial / Repo Setup

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 13 | First / initial commit | `/^(?:first\|initial)\s+commit$/i` | Initialized | `Initial commit` | `Initialized the repository.` |
| 14 | Init project | `/^init(?:ialize)?\s+(.+)/i` | Initialized | `Initialize React project` | `Initialized React project.` |
| 15 | Scaffold / bootstrap | `/^(?:scaffold\|bootstrap)\s+(.+)/i` | Scaffolded | `Scaffold express server` | `Scaffolded express server.` |
| 16 | Project setup | `/^(?:project\s+)?setup\s*(.*)$/i` | Set up | `Setup CI pipeline` | `Set up CI pipeline.` |

---

### 5 — Deployments & Publishing

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 17 | Deploy to target | `/^deploy(?:ed)?\s+(?:to\s+)?(.+)/i` | Deployed | `Deploy to production` | `Deployed to production.` |
| 18 | Deploy (bare) | `/^deploy$/i` | Deployed | `deploy` | `Deployed the application.` |
| 19 | Publish package | `/^publish\s+(.+)/i` | Published | `Publish @gitly/core to npm` | `Published @gitly/core to npm.` |
| 20 | Build for target | `/^build\s+(?:for\s+)?(.+)/i` | Built | `Build for production` | `Built for production.` |

---

### 6 — Dependencies

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 21 | Bump specific dep to version | `/^bump\s+(\S+)\s+(?:to\s+\|from\s+\S+\s+to\s+)v?(\S+)/i` | Bumped | `Bump axios to 1.6.0` | `Bumped axios to v1.6.0.` |
| 22 | Upgrade / update deps | `/^(?:upgrade\|update)\s+(?:all\s+)?dep(?:endencie)?s?/i` | Updated | `Upgrade dependencies` | `Updated dependencies.` |
| 23 | Add dependency | `/^(?:add\|install)\s+(\S+)\s+(?:dep|dependency|package)/i` | Added | `Add lodash dependency` | `Added lodash dependency.` |
| 24 | Remove dependency | `/^(?:remove\|uninstall\|drop)\s+(\S+)\s+(?:dep|dependency|package)/i` | Removed | `Remove moment dependency` | `Removed moment dependency.` |
| 25 | Lock file update | `/^(?:update\|regenerate\|refresh)\s+(?:lock\s*file\|package-lock\|yarn\.lock)/i` | Updated | `Update lockfile` | `Updated lock file.` |
| 26 | npm/yarn/pnpm install | `/^(?:npm\|yarn\|pnpm)\s+install/i` | Installed | `npm install` | `Installed dependencies.` |

---

### 7 — Testing

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 27 | Add tests for target | `/^add\s+(?:unit\s+\|integration\s+\|e2e\s+)?tests?\s+(?:for\s+)?(.+)/i` | Added tests | `Add unit tests for auth module` | `Added tests for auth module.` |
| 28 | Fix test(s) | `/^fix\s+(?:broken\s+\|failing\s+)?tests?\s*(?:for\s+)?(.*)$/i` | Fixed tests | `Fix failing tests for login` | `Fixed tests for login.` |
| 29 | Improve coverage | `/^(?:improve\|increase\|add)\s+(?:test\s+)?coverage\s*(?:for\s+)?(.*)$/i` | Improved coverage | `Improve test coverage for utils` | `Improved coverage for utils.` |
| 30 | Update test snapshots | `/^update\s+(?:test\s+)?snapshots?/i` | Updated | `Update snapshots` | `Updated test snapshots.` |
| 31 | Generic test mention | `/^tests?\s*:\s*(.+)/i` | Tested | `test: add edge case for parser` | `Tested add edge case for parser.` |

---

### 8 — Documentation

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 32 | Update README | `/^(?:update\|improve\|rewrite\|edit)\s+readme(?:\.md)?/i` | Updated | `Update README.md` | `Updated the README.` |
| 33 | Add/update changelog | `/^(?:add\|update)\s+changelog/i` | Updated | `Update changelog` | `Updated the changelog.` |
| 34 | Add/update docs for target | `/^(?:add\|update\|write\|improve)\s+docs?\s+(?:for\s+)?(.+)/i` | Documented | `Add docs for API endpoints` | `Documented API endpoints.` |
| 35 | Add/update comments | `/^(?:add\|update\|improve)\s+(?:code\s+)?comments?\s*(?:in\s+\|for\s+)?(.*)$/i` | Added comments | `Add comments in auth.js` | `Added comments in auth.js.` |

---

### 9 — Configuration & CI/CD

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 36 | CI/CD config | `/^(?:update\|add\|fix\|configure)\s+(?:ci(?:\/cd)?\|github\s+actions?\|circleci\|jenkins\|travis)\s*(.*)/i` | Configured | `Update GitHub Actions workflow` | `Configured GitHub Actions workflow.` |
| 37 | Docker related | `/^(?:add\|update\|fix)\s+dockerfile\s*(.*)/i` | Updated | `Update Dockerfile for prod` | `Updated Dockerfile for prod.` |
| 38 | Config file update | `/^(?:update\|add\|modify\|fix)\s+(?:\.?(?:env\|config\|eslint\|prettier\|babel\|webpack\|vite))\s*(.*)/i` | Updated config | `Update .env defaults` | `Updated config for .env defaults.` |
| 39 | Ignore file | `/^(?:update\|add)\s+\.?(?:gitignore\|dockerignore\|npmignore)/i` | Updated | `Add .gitignore` | `Updated ignore rules.` |

---

### 10 — Security

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 40 | Security fix | `/^(?:fix\|patch\|address)\s+(?:security\s+)?(?:vuln(?:erabilit)?(?:y\|ies)\|cve\|xss\|csrf\|injection)\s*(.*)/i` | Patched | `Fix XSS vulnerability in comments` | `Patched XSS vulnerability in comments.` |
| 41 | Auth / token / password | `/^(?:add\|update\|fix\|improve\|implement)\s+(?:auth(?:entication\|orization)?\|token\|password\|oauth\|session)\s*(.*)/i` | Updated auth | `Implement OAuth2 flow` | `Updated auth: OAuth2 flow.` |
| 42 | Encryption / hashing | `/^(?:add\|update\|implement)\s+(?:encrypt(?:ion)?\|hash(?:ing)?\|ssl\|tls)\s*(.*)/i` | Secured | `Add encryption for user data` | `Secured encryption for user data.` |

---

### 11 — Performance

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 43 | Optimize target | `/^(?:optimize\|perf\|improve\s+perf(?:ormance)?)\s*(?:of\s+\|for\s+\|:\s*)?(.+)/i` | Optimized | `Optimize database queries` | `Optimized database queries.` |
| 44 | Add caching | `/^(?:add\|implement\|enable)\s+(?:cach(?:e\|ing))\s*(?:for\s+)?(.*)$/i` | Added caching | `Add caching for API responses` | `Added caching for API responses.` |
| 45 | Lazy load / code split | `/^(?:add\|implement\|enable)\s+(?:lazy\s+load(?:ing)?\|code\s+split(?:ting)?)\s*(?:for\s+)?(.*)$/i` | Optimized loading | `Enable lazy loading for images` | `Optimized loading for images.` |

---

### 12 — Refactoring & Cleanup

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 46 | Refactor target | `/^refactor\s*(?::\s*)?(.+)/i` | Refactored | `Refactor auth middleware` | `Refactored auth middleware.` |
| 47 | Remove dead code | `/^(?:remove\|delete\|clean\s*up)\s+(?:dead\|unused\|obsolete)\s+(?:code\|imports?\|files?)\s*(.*)/i` | Cleaned up | `Remove dead code in utils/` | `Cleaned up dead code in utils/.` |
| 48 | Simplify | `/^simplify\s+(.+)/i` | Simplified | `Simplify error handling logic` | `Simplified error handling logic.` |
| 49 | Rename / move | `/^(?:rename\|move)\s+(\S+)\s+(?:to\s+)(\S+)/i` | Renamed | `Rename utils.js to helpers.js` | `Renamed utils.js → helpers.js.` |
| 50 | Cleanup (bare) | `/^clean\s*up\s*(.*)/i` | Cleaned up | `Cleanup old API routes` | `Cleaned up old API routes.` |

---

### 13 — Minor Fixes & Formatting

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 51 | Fix typo / spelling | `/^(?:fix\|correct)\s+(?:typo\|spelling\|misspelling)s?\s*(?:in\s+)?(.*)$/i` | Fixed typo | `Fix typo in README` | `Fixed typo in README.` |
| 52 | Lint / format / prettier | `/^(?:run\s+)?(?:lint\|format\|prettier\|eslint)\s*(?:fix(?:es)?)?\s*(.*)/i` | Formatted | `Run prettier on all files` | `Formatted codebase.` |
| 53 | Whitespace / indentation | `/^(?:fix\|clean\s*up\|normalize)\s+(?:whitespace\|indentation\|spacing\|tabs)/i` | Cleaned up | `Fix whitespace issues` | `Cleaned up whitespace.` |

---

### 14 — Bug Fixes (non-conventional)

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 54 | Fix + target (no colon) | `/^fix(?:e[sd])?\s+(.+)/i` | Fixed | `Fixed login redirect loop` | `Fixed login redirect loop.` |
| 55 | Hotfix | `/^hotfix\s*(?::\s*\|[-–]\s*)?(.+)/i` | Hotfixed | `Hotfix: crash on empty input` | `Hotfixed crash on empty input.` |
| 56 | Patch target | `/^patch\s+(.+)/i` | Patched | `Patch memory leak in worker` | `Patched memory leak in worker.` |
| 57 | Bugfix | `/^bugfix\s*(?::\s*\|[-–]\s*)?(.+)/i` | Fixed | `Bugfix - avatar not rendering` | `Fixed avatar not rendering.` |

---

### 15 — Work in Progress

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 58 | WIP with description | `/^(?:wip\|draft\|🚧)\s*(?::\s*\|[-–]\s*)?(.+)/i` | Work in progress | `WIP: dark mode support` | `Work in progress: dark mode support.` |
| 59 | WIP bare | `/^(?:wip\|draft\|🚧)$/i` | Work in progress | `WIP` | `Work in progress.` |

---

### 16 — Generic Updates (catch-all tier)

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 60 | Add + target | `/^add(?:ed)?\s+(.+)/i` | Added | `Add dark mode toggle` | `Added dark mode toggle.` |
| 61 | Remove / delete + target | `/^(?:remove[d]?\|delete[d]?)\s+(.+)/i` | Removed | `Remove deprecated API route` | `Removed deprecated API route.` |
| 62 | Update + target | `/^update[d]?\s+(.+)/i` | Updated | `Update header styles` | `Updated header styles.` |
| 63 | Improve / enhance + target | `/^(?:improve[d]?\|enhance[d]?)\s+(.+)/i` | Improved | `Improve error messages` | `Improved error messages.` |
| 64 | Implement + target | `/^implement(?:ed)?\s+(.+)/i` | Implemented | `Implement search feature` | `Implemented search feature.` |
| 65 | Change / modify + target | `/^(?:change[d]?\|modif(?:y\|ied))\s+(.+)/i` | Changed | `Change footer layout` | `Changed footer layout.` |
| 66 | Tweak / polish + target | `/^(?:tweak(?:ed)?\|polish(?:ed)?)\s+(.+)/i` | Tweaked | `Polish landing page animations` | `Tweaked landing page animations.` |
| 67 | Enable / disable + target | `/^(?:enable[d]?\|disable[d]?)\s+(.+)/i` | Toggled | `Enable dark mode by default` | `Toggled: enable dark mode by default.` |
| 68 | Replace + target | `/^replace[d]?\s+(.+)/i` | Replaced | `Replace moment with dayjs` | `Replaced moment with dayjs.` |
| 69 | Migrate + target | `/^migrate[d]?\s+(.+)/i` | Migrated | `Migrate to TypeScript` | `Migrated to TypeScript.` |

---

### 17 — DEFAULT Fallback

| # | Pattern | Regex | Action | Example In | Example Out |
|---|---------|-------|--------|------------|-------------|
| 70 | Anything unmatched | `/.+/` | — | `some random commit msg` | `some random commit msg.` (capitalize first letter, ensure period) |

---

## JavaScript Implementation

```javascript
/**
 * Gitly — Client-side commit message summarizer.
 * Pure regex, no API calls. First match wins.
 *
 * @param {string} message - Raw commit message (first line only recommended)
 * @returns {string} Human-friendly summary, ≤ 8 words when possible
 */
function generateCommitSummary(message) {
  if (!message || typeof message !== 'string') return 'Empty commit message.';

  // Trim and take only the first line (subject line)
  const raw = message.trim().split('\n')[0].trim();
  if (!raw) return 'Empty commit message.';

  // ──────────────────────────────────────────────
  // Rule definitions: [regex, formatter]
  // Order matters — most specific first.
  // ──────────────────────────────────────────────
  const rules = [

    // ── 1. Merges ──────────────────────────────
    [
      /^merge pull request #(\d+)\s+from\s+(.+)/i,
      (m) => `Merged PR #${m[1]} from ${m[2].trim()}.`
    ],
    [
      /^merge pull request\s+from\s+(.+)/i,
      (m) => `Merged PR from ${m[1].trim()}.`
    ],
    [
      /^merge (?:branch\s+)?['"]?(.+?)['"]?\s+into\s+['"]?(.+?)['"]?$/i,
      (m) => `Merged ${m[1]} into ${m[2]}.`
    ],
    [
      /^merge (?:branch\s+)?['"]?(.+?)['"]?$/i,
      (m) => `Merged branch ${m[1]}.`
    ],
    [
      /^merge\s+([a-f0-9]{7,40})/i,
      (m) => `Merged commit ${m[1]}.`
    ],

    // ── 2. Reverts ─────────────────────────────
    [
      /^revert\s+["'](.+?)["']/i,
      (m) => `Reverted "${m[1]}".`
    ],
    [
      /^rollback\s+to\s+v?(\S+)/i,
      (m) => `Rolled back to v${m[1].replace(/^v/, '')}.`
    ],
    [
      /^(?:revert|rollback|undo)\s+(.+)/i,
      (m) => `Reverted ${m[1].trim()}.`
    ],

    // ── 3. Version / Release ───────────────────
    [
      /^release\s+v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)/i,
      (m) => `Released v${m[1]}.`
    ],
    [
      /^bump\s+(\S+)\s+(?:to\s+|from\s+\S+\s+to\s+)v?(\S+)/i,
      (m) => `Bumped ${m[1]} to v${m[2].replace(/^v/, '')}.`
    ],
    [
      /^bump\s+(?:version\s+)?(?:to\s+)?v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)/i,
      (m) => `Bumped version to v${m[1]}.`
    ],
    [
      /^tag\s+v?(\d+\.\d+(?:\.\d+)?(?:[-\w.]*)?)/i,
      (m) => `Tagged v${m[1]}.`
    ],
    [
      /^v?(\d+\.\d+\.\d+(?:[-\w.]*)?)$/i,
      (m) => `Released v${m[1]}.`
    ],

    // ── 4. Initial / Setup ─────────────────────
    [
      /^(?:first|initial)\s+commit$/i,
      () => 'Initialized the repository.'
    ],
    [
      /^init(?:ialize)?\s+(.+)/i,
      (m) => `Initialized ${m[1].trim()}.`
    ],
    [
      /^(?:scaffold|bootstrap)\s+(.+)/i,
      (m) => `Scaffolded ${m[1].trim()}.`
    ],
    [
      /^(?:project\s+)?setup\s*(.+)?$/i,
      (m) => m[1] ? `Set up ${m[1].trim()}.` : 'Set up the project.'
    ],

    // ── 5. Deploy / Publish ────────────────────
    [
      /^deploy(?:ed)?\s+(?:to\s+)?(.+)/i,
      (m) => `Deployed to ${m[1].trim()}.`
    ],
    [
      /^deploy$/i,
      () => 'Deployed the application.'
    ],
    [
      /^publish\s+(.+)/i,
      (m) => `Published ${m[1].trim()}.`
    ],
    [
      /^build\s+(?:for\s+)?(.+)/i,
      (m) => `Built for ${m[1].trim()}.`
    ],

    // ── 6. Dependencies ────────────────────────
    [
      /^(?:upgrade|update)\s+(?:all\s+)?dep(?:endencie)?s?$/i,
      () => 'Updated dependencies.'
    ],
    [
      /^(?:add|install)\s+(\S+)\s+(?:dep(?:endency)?|package)/i,
      (m) => `Added ${m[1]} dependency.`
    ],
    [
      /^(?:remove|uninstall|drop)\s+(\S+)\s+(?:dep(?:endency)?|package)/i,
      (m) => `Removed ${m[1]} dependency.`
    ],
    [
      /^(?:update|regenerate|refresh)\s+(?:lock\s*file|package-lock|yarn\.lock)/i,
      () => 'Updated lock file.'
    ],
    [
      /^(?:npm|yarn|pnpm)\s+install/i,
      () => 'Installed dependencies.'
    ],

    // ── 7. Testing ─────────────────────────────
    [
      /^add\s+(?:unit\s+|integration\s+|e2e\s+)?tests?\s+(?:for\s+)?(.+)/i,
      (m) => `Added tests for ${m[1].trim()}.`
    ],
    [
      /^fix\s+(?:broken\s+|failing\s+)?tests?\s*(?:for\s+)?(.*)$/i,
      (m) => m[1] ? `Fixed tests for ${m[1].trim()}.` : 'Fixed tests.'
    ],
    [
      /^(?:improve|increase|add)\s+(?:test\s+)?coverage\s*(?:for\s+)?(.*)$/i,
      (m) => m[1] ? `Improved coverage for ${m[1].trim()}.` : 'Improved test coverage.'
    ],
    [
      /^update\s+(?:test\s+)?snapshots?/i,
      () => 'Updated test snapshots.'
    ],
    [
      /^tests?\s*:\s*(.+)/i,
      (m) => `Tested ${m[1].trim()}.`
    ],

    // ── 8. Documentation ──────────────────────
    [
      /^(?:update|improve|rewrite|edit)\s+readme(?:\.md)?/i,
      () => 'Updated the README.'
    ],
    [
      /^(?:add|update)\s+changelog/i,
      () => 'Updated the changelog.'
    ],
    [
      /^(?:add|update|write|improve)\s+docs?\s+(?:for\s+)?(.+)/i,
      (m) => `Documented ${m[1].trim()}.`
    ],
    [
      /^(?:add|update|improve)\s+(?:code\s+)?comments?\s*(?:in\s+|for\s+)?(.*)$/i,
      (m) => m[1] ? `Added comments in ${m[1].trim()}.` : 'Added code comments.'
    ],

    // ── 9. Config / CI/CD ─────────────────────
    [
      /^(?:update|add|fix|configure)\s+(?:ci(?:\/cd)?|github\s+actions?|circleci|jenkins|travis)\s*(.*)/i,
      (m) => m[1] ? `Configured CI/CD: ${m[1].trim()}.` : 'Configured CI/CD pipeline.'
    ],
    [
      /^(?:add|update|fix)\s+dockerfile\s*(.*)/i,
      (m) => m[1] ? `Updated Dockerfile ${m[1].trim()}.` : 'Updated Dockerfile.'
    ],
    [
      /^(?:update|add|modify|fix)\s+\.?(?:env|config|eslint|prettier|babel|webpack|vite)\s*(.*)/i,
      (m) => m[1] ? `Updated config: ${m[1].trim()}.` : 'Updated configuration.'
    ],
    [
      /^(?:update|add)\s+\.?(?:gitignore|dockerignore|npmignore)/i,
      () => 'Updated ignore rules.'
    ],

    // ── 10. Security ──────────────────────────
    [
      /^(?:fix|patch|address)\s+(?:security\s+)?(?:vuln(?:erabilit)?(?:y|ies)|cve|xss|csrf|injection)\s*(.*)/i,
      (m) => m[1] ? `Patched vulnerability in ${m[1].trim()}.` : 'Patched security vulnerability.'
    ],
    [
      /^(?:add|update|fix|improve|implement)\s+(?:auth(?:entication|orization)?|token|password|oauth|session)\s*(.*)/i,
      (m) => m[1] ? `Updated auth: ${m[1].trim()}.` : 'Updated authentication.'
    ],
    [
      /^(?:add|update|implement)\s+(?:encrypt(?:ion)?|hash(?:ing)?|ssl|tls)\s*(.*)/i,
      (m) => m[1] ? `Secured ${m[1].trim()}.` : 'Added encryption.'
    ],

    // ── 11. Performance ───────────────────────
    [
      /^(?:optimize|perf|improve\s+perf(?:ormance)?)\s*(?:of\s+|for\s+|:\s*)?(.+)/i,
      (m) => `Optimized ${m[1].trim()}.`
    ],
    [
      /^(?:add|implement|enable)\s+cach(?:e|ing)\s*(?:for\s+)?(.*)$/i,
      (m) => m[1] ? `Added caching for ${m[1].trim()}.` : 'Added caching.'
    ],
    [
      /^(?:add|implement|enable)\s+(?:lazy\s+load(?:ing)?|code\s+split(?:ting)?)\s*(?:for\s+)?(.*)$/i,
      (m) => m[1] ? `Optimized loading for ${m[1].trim()}.` : 'Optimized loading.'
    ],

    // ── 12. Refactoring / Cleanup ─────────────
    [
      /^refactor\s*(?::\s*)?(.+)/i,
      (m) => `Refactored ${m[1].trim()}.`
    ],
    [
      /^(?:remove|delete|clean\s*up)\s+(?:dead|unused|obsolete)\s+(?:code|imports?|files?)\s*(.*)/i,
      (m) => m[1] ? `Cleaned up dead code in ${m[1].trim()}.` : 'Cleaned up dead code.'
    ],
    [
      /^simplify\s+(.+)/i,
      (m) => `Simplified ${m[1].trim()}.`
    ],
    [
      /^(?:rename|move)\s+(\S+)\s+(?:to\s+)(\S+)/i,
      (m) => `Renamed ${m[1]} → ${m[2]}.`
    ],
    [
      /^clean\s*up\s*(.*)/i,
      (m) => m[1] ? `Cleaned up ${m[1].trim()}.` : 'Cleaned up codebase.'
    ],

    // ── 13. Minor Fixes / Formatting ──────────
    [
      /^(?:fix|correct)\s+(?:typo|spelling|misspelling)s?\s*(?:in\s+)?(.*)$/i,
      (m) => m[1] ? `Fixed typo in ${m[1].trim()}.` : 'Fixed typo.'
    ],
    [
      /^(?:run\s+)?(?:lint|format|prettier|eslint)\s*(?:fix(?:es)?)?\s*(.*)/i,
      (m) => m[1] ? `Formatted ${m[1].trim()}.` : 'Formatted codebase.'
    ],
    [
      /^(?:fix|clean\s*up|normalize)\s+(?:whitespace|indentation|spacing|tabs)/i,
      () => 'Cleaned up whitespace.'
    ],

    // ── 14. Bug Fixes (non-conventional) ──────
    [
      /^hotfix\s*(?::\s*|[-–]\s*)?(.+)/i,
      (m) => `Hotfixed ${m[1].trim()}.`
    ],
    [
      /^bugfix\s*(?::\s*|[-–]\s*)?(.+)/i,
      (m) => `Fixed ${m[1].trim()}.`
    ],
    [
      /^patch\s+(.+)/i,
      (m) => `Patched ${m[1].trim()}.`
    ],
    [
      /^fix(?:e[sd])?\s+(.+)/i,
      (m) => `Fixed ${m[1].trim()}.`
    ],

    // ── 15. WIP ───────────────────────────────
    [
      /^(?:wip|draft|🚧)\s*(?::\s*|[-–]\s*)?(.+)/i,
      (m) => `Work in progress: ${m[1].trim()}.`
    ],
    [
      /^(?:wip|draft|🚧)$/i,
      () => 'Work in progress.'
    ],

    // ── 16. Generic verbs (catch-all tier) ────
    [
      /^add(?:ed)?\s+(.+)/i,
      (m) => `Added ${m[1].trim()}.`
    ],
    [
      /^(?:remove[d]?|delete[d]?)\s+(.+)/i,
      (m) => `Removed ${m[1].trim()}.`
    ],
    [
      /^implement(?:ed)?\s+(.+)/i,
      (m) => `Implemented ${m[1].trim()}.`
    ],
    [
      /^(?:improve[d]?|enhance[d]?)\s+(.+)/i,
      (m) => `Improved ${m[1].trim()}.`
    ],
    [
      /^(?:change[d]?|modif(?:y|ied))\s+(.+)/i,
      (m) => `Changed ${m[1].trim()}.`
    ],
    [
      /^update[d]?\s+(.+)/i,
      (m) => `Updated ${m[1].trim()}.`
    ],
    [
      /^(?:tweak(?:ed)?|polish(?:ed)?)\s+(.+)/i,
      (m) => `Tweaked ${m[1].trim()}.`
    ],
    [
      /^(?:enable[d]?|disable[d]?)\s+(.+)/i,
      (m) => `Toggled ${m[1].trim()}.`
    ],
    [
      /^replace[d]?\s+(.+)/i,
      (m) => `Replaced ${m[1].trim()}.`
    ],
    [
      /^migrate[d]?\s+(.+)/i,
      (m) => `Migrated ${m[1].trim()}.`
    ],
  ];

  // ── Run rules ──────────────────────────────
  for (const [regex, formatter] of rules) {
    const match = raw.match(regex);
    if (match) {
      return truncate(formatter(match));
    }
  }

  // ── DEFAULT fallback ───────────────────────
  return truncate(capitalize(raw) + (raw.endsWith('.') ? '' : '.'));
}


// ── Helpers ──────────────────────────────────

/**
 * Capitalize the first letter of a string.
 */
function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate a summary to roughly 8 words, appending "…" if cut.
 * Preserves the trailing period.
 */
function truncate(str, maxWords = 8) {
  const words = str.replace(/\.$/, '').split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(' ') + '….';
}
```

---

## Quick Reference — Category Priority Order

The function evaluates rules in this order. If your commit matches multiple categories, the **first** hit wins:

```
 1. Merges           (most specific — structural Git operations)
 2. Reverts
 3. Version / Release
 4. Initial / Setup
 5. Deploy / Publish
 6. Dependencies
 7. Testing
 8. Documentation
 9. Config / CI-CD
10. Security
11. Performance
12. Refactoring
13. Minor Fixes      (typos, formatting, whitespace)
14. Bug Fixes        (non-conventional "fix ...")
15. WIP
16. Generic Verbs    (add, remove, update, change … catch-all)
17. DEFAULT          (capitalize + period — most generic)
```

> [!TIP]
> **Bug fixes (category 14) are placed after minor fixes (13)** on purpose. The generic `/^fix(?:e[sd])?\s+(.+)/i` would otherwise swallow `"fix typo in README"` before the typo-specific rule could match. Always order narrow patterns before their broader supersets.

> [!NOTE]
> The `truncate()` helper enforces the ≤ 8-word limit. You can raise `maxWords` or remove the helper entirely if your UI has room for longer summaries.
