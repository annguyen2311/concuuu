-- PostgreSQL schema for StudentNet
-- Consolidated from SQLite migrations 001-006

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  reputation INTEGER NOT NULL DEFAULT 0,
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  major TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'member',
  join_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, username)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  salary TEXT NOT NULL DEFAULT 'Thỏa thuận',
  type TEXT NOT NULL DEFAULT 'Toàn thời gian',
  level TEXT NOT NULL DEFAULT 'Fresher',
  location TEXT NOT NULL DEFAULT 'Hà Nội',
  skills JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  posted_by TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  post_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id, type)
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  icon TEXT NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  room TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_room_created_at ON messages (room, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, username)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions (message_id);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  icon TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'admin',
  is_broadcast BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_tags (
  user_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS friendships (
  requester TEXT NOT NULL,
  addressee TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester, addressee)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'public',
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💬',
  category TEXT NOT NULL DEFAULT 'Cộng đồng',
  topic TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, username)
);

CREATE INDEX IF NOT EXISTS idx_chat_room_members_username ON chat_room_members (username);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'suggestion',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_username_created_at ON feedback (username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created_at ON feedback (status, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO app_settings (key, value) VALUES
  ('theme', '{"brandName":"Cộng đồng sinh viên NTTU","accent":"#2563eb","accentStrong":"#0f766e","pageBg":"#f3f6fb","sidebarBg":"rgba(15, 23, 42, 0.96)","customCss":""}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO events (id, icon, title, date, time) VALUES
  (1, '🎓', 'Trao Đổi Kỹ Thuật: AI & ML', '25 Tháng 4', '2:00 SA'),
  (2, '💼', 'Hội Chợ Việc Làm CNTT', '28 Tháng 4', '9:00 SA'),
  (3, '🚀', 'Hackathon Sinh Viên 2026', '30 Tháng 4', '8:00 SA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO announcements (id, title, body, date, created_by, is_broadcast) VALUES
  (1, 'Tính Năng Mới: Nhắn Tin Trực Tiếp', 'Trò chuyện nhanh hơn và ổn định hơn.', '2 giờ trước', 'system', FALSE),
  (2, 'Bảo Trì Hệ Thống Cuối Tuần', 'Hệ thống sẽ bảo trì ngắn trong cuối tuần.', '1 ngày trước', 'system', FALSE),
  (3, 'Mở đăng ký workshop tháng này', 'Sinh viên có thể đăng ký ngay tại trang sự kiện.', '2 ngày trước', 'system', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tags (id, name, color) VALUES
  (1, 'React', '#61dafb'),
  (2, 'Node.js', '#3c873a'),
  (3, 'Python', '#3776ab'),
  (4, 'UI/UX', '#a855f7'),
  (5, 'SQL', '#f59e0b')
ON CONFLICT (id) DO NOTHING;

-- Reset sequences
SELECT setval('events_id_seq', COALESCE((SELECT MAX(id) FROM events), 0) + 1, FALSE);
SELECT setval('announcements_id_seq', COALESCE((SELECT MAX(id) FROM announcements), 0) + 1, FALSE);
SELECT setval('tags_id_seq', COALESCE((SELECT MAX(id) FROM tags), 0) + 1, FALSE);
