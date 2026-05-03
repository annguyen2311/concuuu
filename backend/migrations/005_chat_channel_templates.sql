ALTER TABLE chat_rooms ADD COLUMN category TEXT NOT NULL DEFAULT 'Cộng đồng';
ALTER TABLE chat_rooms ADD COLUMN topic TEXT NOT NULL DEFAULT '';
ALTER TABLE chat_rooms ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE chat_rooms ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;

UPDATE chat_rooms
SET category = 'Cộng đồng', topic = 'Kênh trò chuyện chung cho sinh viên NTTU', position = 10
WHERE id = 'general';

UPDATE chat_rooms
SET category = 'Học tập', topic = 'Trao đổi React, frontend và UI', position = 110
WHERE id = 'react';

UPDATE chat_rooms
SET category = 'Học tập', topic = 'Node.js, backend và API', position = 120
WHERE id = 'nodejs';

UPDATE chat_rooms
SET category = 'Học tập', topic = 'Python, data và automation', position = 130
WHERE id = 'python';

UPDATE chat_rooms
SET category = 'Thiết kế', topic = 'UI, UX, web design và portfolio', position = 210
WHERE id = 'webdesign';

INSERT OR IGNORE INTO chat_rooms (id, type, name, icon, category, topic, position, is_locked, created_by) VALUES
  ('announcements', 'public', 'thông-báo', '#', 'Bắt đầu', 'Thông báo quan trọng từ cộng đồng', 1, 1, 'system'),
  ('rules', 'public', 'quy-định', '#', 'Bắt đầu', 'Nội quy và hướng dẫn sử dụng cộng đồng', 2, 1, 'system'),
  ('introductions', 'public', 'giới-thiệu', '#', 'Cộng đồng', 'Tự giới thiệu và làm quen với mọi người', 20, 0, 'system'),
  ('questions', 'public', 'hỏi-đáp', '#', 'Học tập', 'Đặt câu hỏi học tập và nhờ hỗ trợ', 100, 0, 'system'),
  ('assignments', 'public', 'bài-tập', '#', 'Học tập', 'Trao đổi bài tập, tài liệu và deadline', 140, 0, 'system'),
  ('projects', 'public', 'dự-án', '#', 'Dự án', 'Tìm teammate và khoe sản phẩm đang làm', 300, 0, 'system'),
  ('internships', 'public', 'thực-tập', '#', 'Việc làm', 'Cơ hội thực tập và kinh nghiệm apply', 400, 0, 'system'),
  ('career', 'public', 'career-talk', '#', 'Việc làm', 'CV, phỏng vấn và định hướng nghề nghiệp', 410, 0, 'system'),
  ('events-community', 'public', 'sự-kiện', '#', 'Cộng đồng', 'Sự kiện, workshop và hoạt động sinh viên', 500, 0, 'system'),
  ('random', 'public', 'chuyện-phiếm', '#', 'Giải trí', 'Nơi trò chuyện nhẹ nhàng ngoài giờ học', 900, 0, 'system');
