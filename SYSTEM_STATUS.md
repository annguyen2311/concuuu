# Cộng đồng sinh viên NTTU System Status

Generated context: 2026-04-27

## Current Runtime

- Frontend: React 18 + Vite
- Backend: Express + Socket.io
- Database: SQLite through `better-sqlite3`
- Backend default port: `3001`
- Frontend dev default port: `5173`
- Production serving: `frontend/dist` is served by `backend/server.js`

## Implemented Features

- User registration/login with bcrypt password hashing and JWT token issuance
- Profile editing with bio, school, major, avatar, cover image and tags
- Posts with likes and comments
- Job board with job posting, filtering, applying and bookmarking
- Bookmark list for posts and jobs
- Realtime chat with public rooms, private rooms, group rooms, typing state and message reactions
- Friend requests and friend list
- User settings persisted to SQLite
- Dark mode theme variables applied from settings
- Admin login with admin JWT
- Admin overview, user management, post/job moderation, room management, announcements, events and admin creation

## Source Of Truth

- `backend/db/store.js` contains the active persistence layer.
- `backend/routes/*` contain active API behavior.
- `backend/models/*` are legacy compatibility files and are not used by the active server routes.
- `frontend/src/pages/*` and `frontend/src/components/*` contain the active UI.

## Debug Files

The following are development artifacts, not source:

- `.playwright-mcp/`
- `frontend/vite-dev-*.log`
- `backend/backend-dev-*.log`
- `backend/studentnet.sqlite*`
- `frontend/dist/`
- browser snapshots, screenshots and perf traces

They are covered by `.gitignore`.

## Known Technical Debt

- Mutating REST routes now verify the user JWT and reject cross-user `username`/`userId` spoofing. Socket.io events still need authenticated handshakes for production.
- The legacy `backend/models/*` directory should be removed or replaced once no old tests depend on it.
- `test-api.js` exercises live local data; a future test runner should boot the server against a temporary SQLite database.
- Local image uploads are stored as data URLs in SQLite, which is fine for demos but not ideal for production.
