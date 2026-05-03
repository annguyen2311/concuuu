# Debug Artifact Audit

These files are generated during development, browser checks, local server runs, or database activity. They are now covered by `.gitignore` and should not be treated as source code:

- `.playwright-mcp/`
- `frontend/vite-dev-*.log`
- `backend/backend-dev-*.log`
- `backend/studentnet.sqlite*`
- `frontend/dist/`
- `chrome-perf-trace*.gz`
- `auth_page_snapshot.md`
- `registration_response.md`
- `admin_panel_enhanced.png`
- `settings_page_enhanced.png`
- `home-page.png`

The source files that define the system are in `backend/server.js`, `backend/db`, `backend/routes`, `backend/migrations`, `frontend/src`, package manifests, and the start/stop scripts.
