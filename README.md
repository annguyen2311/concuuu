# Cộng đồng sinh viên NTTU

Cộng đồng sinh viên NTTU là nền tảng cộng đồng sinh viên gồm frontend React/Vite, backend Express/Socket.io và SQLite local. Ứng dụng hỗ trợ đăng ký/đăng nhập, bài viết, bình luận, việc làm, bookmark, chat realtime, bạn bè, profile, feedback cải thiện hệ thống, settings và admin console.

## Kiến trúc hiện tại

- Backend API: `http://localhost:3001`
- Frontend dev server: `http://localhost:5173`
- Production/static frontend: build vào `frontend/dist`, backend sẽ serve từ `http://localhost:3001`
- Database: SQLite qua `better-sqlite3`, mặc định tại `backend/studentnet.sqlite`
- Realtime: Socket.io dùng chung backend port `3001`
- Health check: `GET /api/health`

## Chạy nhanh

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
npm run dev
```

Hoặc trên Windows có thể chạy:

```bash
START_ALL.bat
```

Backend sẽ chạy ở `3001`, frontend dev ở `5173`. Muốn chạy kiểu production:

```bash
npm run build
npm start
```

Sau đó mở `http://localhost:3001`.

Trước khi deploy có thể chạy:

```bash
npm run deploy:check
```

## Cấu hình

Các biến môi trường mẫu nằm trong `.env.example`.

Biến quan trọng:

- `PORT`: port backend, mặc định `3001`
- `DATABASE_PATH`: đường dẫn SQLite tương đối với thư mục `backend`, mặc định `studentnet.sqlite`
- `JWT_SECRET`: secret cho user token
- `ADMIN_JWT_SECRET`: secret cho admin token
- `CORS_ORIGIN`: domain được phép gọi API/WebSocket, production nên đặt domain thật thay vì `*`
- `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`: admin mặc định khi database chưa có admin

Admin mặc định ở môi trường dev là `admin / admin123`. Hãy đổi bằng biến môi trường khi dùng ngoài local.

## Deploy

### Option 1: Railway/Render (Full Stack - Recommended)

Bản production chạy một Node service: backend Express serve cả API, Socket.io và frontend static từ `frontend/dist`. Nếu dùng SQLite trên hosting, cần gắn persistent disk/volume cho `DATABASE_PATH`.

### Option 2: Vercel (Frontend) + Railway/Render (Backend)

**Backend (Railway/Render):**
1. Push code lên GitHub
2. Connect repo tới Railway hoặc Render
3. Railway sẽ tự detect `Procfile` hoặc `railway.json`
4. Set environment variables trong dashboard Railway:
   - `CORS_ORIGIN` = `https://your-vercel-app.vercel.app`
   - `JWT_SECRET` = (random string)
   - `ADMIN_JWT_SECRET` = (random string)
   - Các biến khác xem `backend/.env.example`
5. Deploy, Railway sẽ cấp URL kiểu `https://xxx.up.railway.app`

**Frontend (Vercel):**
1. Connect GitHub repo tới Vercel
2. Vercel sẽ tự detect `vercel.json` và build frontend
3. Set environment variable trong Vercel dashboard:
   - `VITE_API_URL` = `https://xxx.up.railway.app` (URL backend Railway)
4. Deploy

**Lưu ý:**
- Socket.IO realtime chat sẽ hoạt động bình thường vì backend chạy persistent server
- SQLite cần Railway Volume để data không bị mất khi redeploy (Settings > Volumes > Mount at `/app/backend`)
- CORS_ORIGIN phải đúng domain Vercel frontend

## Source chính

- Backend server: `backend/server.js`
- Database/migrations: `backend/db`, `backend/migrations`
- API routes: `backend/routes`
- Frontend app: `frontend/src/App.jsx`
- Pages/components: `frontend/src/pages`, `frontend/src/components`

`backend/models/*` là lớp legacy Mongoose/in-memory từ phiên bản cũ; request path hiện tại dùng SQLite store trong `backend/db/store.js`.

## Debug/artifact

Các file log, SQLite runtime, Playwright capture, ảnh snapshot và `frontend/dist` đã được đưa vào `.gitignore`. Xem thêm `DEBUG_ARTIFACTS.md`.

## Kiểm tra

```bash
npm run build
cd backend
node test-api.js
```

`test-api.js` cần backend đang chạy ở `http://localhost:3001/api` và sẽ dùng admin mặc định hoặc biến môi trường `DEFAULT_ADMIN_USERNAME` / `DEFAULT_ADMIN_PASSWORD`.
