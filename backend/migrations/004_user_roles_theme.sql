ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

UPDATE users
SET role = 'admin'
WHERE lower(email) = 'annguyen23082007@gmail.com';

INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('theme', '{"brandName":"Cộng đồng sinh viên NTTU","accent":"#2563eb","accentStrong":"#0f766e","pageBg":"#f3f6fb","sidebarBg":"rgba(15, 23, 42, 0.96)","customCss":""}');
