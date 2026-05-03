ALTER TABLE users ADD COLUMN cover_image TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS friendships (
  requester TEXT NOT NULL,
  addressee TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (requester, addressee)
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'public',
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '💬',
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, username)
);

INSERT OR IGNORE INTO chat_rooms (id, type, name, icon, created_by) VALUES
  ('general', 'public', 'Chung', '💬', 'system'),
  ('react', 'public', 'React', '⚛️', 'system'),
  ('nodejs', 'public', 'Node.js', '🟢', 'system'),
  ('python', 'public', 'Python', '🐍', 'system'),
  ('webdesign', 'public', 'Web Design', '🎨', 'system');

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships (requester);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships (addressee);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_username ON chat_room_members (username);
