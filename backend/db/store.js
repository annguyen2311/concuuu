const crypto = require('crypto');
const config = require('../config');
const db = require('./index');

const parseJsonArray = (value) => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const LEVEL_STEP = 100;
const levelTitles = [
  'Thành viên mới',
  'Đang kết nối',
  'Tích cực',
  'Nổi bật',
  'Dẫn dắt',
  'Chuyên gia',
  'Huyền thoại',
];

const isPrimaryAdminEmail = (email) => (
  String(email || '').trim().toLowerCase() === config.primaryAdminEmail
);

const isPrimaryAdminUser = (user) => isPrimaryAdminEmail(user?.email);

const canManageUserRoles = (actor) => isPrimaryAdminEmail(actor?.email);

const makeHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

function getLevelInfo(reputation = 0) {
  const xp = Math.max(0, Math.round(Number(reputation) || 0));
  const level = Math.floor(xp / LEVEL_STEP) + 1;
  const currentLevelXp = (level - 1) * LEVEL_STEP;
  const nextLevelXp = level * LEVEL_STEP;
  const progress = Math.min(100, Math.max(0, Math.round(((xp - currentLevelXp) / LEVEL_STEP) * 100)));
  const title = levelTitles[Math.min(level - 1, levelTitles.length - 1)];

  return {
    level,
    title,
    xp,
    currentLevelXp,
    nextLevelXp,
    progress,
    pointsToNext: Math.max(0, nextLevelXp - xp),
  };
}

const mapUser = (row) => {
  if (!row) return null;
  const reputation = Math.max(0, Math.round(Number(row.reputation) || 0));
  const level = getLevelInfo(reputation);
  const isOwner = isPrimaryAdminEmail(row.email);
  return {
    _id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    role: isOwner ? 'admin' : (row.role || 'member'),
    reputation,
    level,
    levelNumber: level.level,
    isOwner,
    bio: row.bio,
    avatar: row.avatar || (row.username ? row.username.charAt(0).toUpperCase() : 'U'),
    coverImage: row.cover_image || '',
    school: row.school,
    major: row.major,
    joinDate: row.join_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapAdmin = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    role: row.role,
    createdAt: row.created_at,
  };
};

const mapActivity = (row) => ({
  _id: row.id,
  username: row.username,
  action: row.action,
  target: row.target,
  icon: row.icon,
  time: row.time,
});

const mapMessage = (row) => ({
  _id: row.id,
  room: row.room,
  username: row.username,
  message: row.message,
  createdAt: row.created_at,
  avatar: row.avatar || (row.username ? row.username.charAt(0).toUpperCase() : 'U'),
});

const attachMessageMeta = (row) => {
  if (!row) return null;

  const reactions = db.prepare(`
    SELECT username, reaction, created_at
    FROM message_reactions
    WHERE message_id = ?
    ORDER BY created_at ASC, username ASC
  `).all(row.id).map((reaction) => ({
    username: reaction.username,
    reaction: reaction.reaction,
    createdAt: reaction.created_at,
  }));

  return {
    ...mapMessage(row),
    reactions,
  };
};

const mapEvent = (row) => ({
  _id: row.id,
  icon: row.icon,
  title: row.title,
  date: row.date,
  time: row.time,
  createdAt: row.created_at,
});

const mapAnnouncement = (row) => ({
  _id: row.id,
  title: row.title,
  body: row.body,
  date: row.date || row.created_at,
  createdAt: row.created_at,
  createdBy: row.created_by,
  isBroadcast: Boolean(row.is_broadcast),
});

const mapBookmark = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.user_id,
    postId: row.post_id,
    type: row.type,
    createdAt: row.created_at,
  };
};

const mapFeedback = (row) => {
  if (!row) return null;
  return {
    _id: row.id,
    username: row.username,
    type: row.type,
    title: row.title,
    message: row.message,
    rating: row.rating,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const attachPostMeta = (row) => {
  const likes = db.prepare('SELECT username FROM post_likes WHERE post_id = ? ORDER BY created_at ASC, username ASC').all(row.id).map(item => item.username);
  const comments = db.prepare('SELECT id, username, text, created_at FROM post_comments WHERE post_id = ? ORDER BY created_at ASC, id ASC').all(row.id).map(comment => ({
    _id: comment.id,
    user: comment.username,
    text: comment.text,
    createdAt: comment.created_at,
  }));

  return {
    _id: row.id,
    author: row.author,
    title: row.title,
    content: row.content,
    likes,
    comments,
    createdAt: row.created_at,
  };
};

const mapJob = (row) => ({
  _id: row.id,
  title: row.title,
  company: row.company,
  salary: row.salary,
  type: row.type,
  level: row.level,
  location: row.location,
  skills: parseJsonArray(row.skills),
  description: row.description,
  postedBy: row.posted_by,
  postedAt: row.posted_at,
});

const mapSafeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

const normalizeRoomId = (value) => String(value || '').trim().toLowerCase();

const makePrivateRoomId = (username, friendUsername) => {
  const [first, second] = [username, friendUsername].map(normalizeRoomId).sort();
  return `dm:${first}:${second}`;
};

const mapRoom = (row, viewer) => {
  const latest = db.prepare(`
    SELECT username, message, created_at
    FROM messages
    WHERE room = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(row.id);

  const memberRows = db.prepare(`
    SELECT u.username, u.avatar, crm.role
    FROM chat_room_members crm
    LEFT JOIN users u ON u.username = crm.username
    WHERE crm.room_id = ?
    ORDER BY CASE crm.role WHEN 'owner' THEN 0 ELSE 1 END, crm.username ASC
  `).all(row.id);

  const members = memberRows.map((member) => ({
    username: member.username,
    avatar: member.avatar || (member.username ? member.username.charAt(0).toUpperCase() : 'U'),
    role: member.role || 'member',
  }));

  let name = row.name;
  let icon = row.icon;
  if (row.type === 'private' && viewer) {
    const friend = members.find((member) => member.username !== viewer);
    if (friend) {
      name = friend.username;
      icon = friend.avatar;
    }
  }

  return {
    id: row.id,
    name,
    icon,
    type: row.type,
    category: row.category || (row.type === 'public' ? 'Cộng đồng' : ''),
    topic: row.topic || '',
    position: row.position || 0,
    isLocked: Boolean(row.is_locked),
    createdBy: row.created_by,
    createdAt: row.created_at,
    lastMessage: latest?.message || '',
    lastUser: latest?.username || '',
    lastTime: latest?.created_at || '',
    messageCount: db.prepare('SELECT COUNT(*) as count FROM messages WHERE room = ?').get(row.id).count,
    members,
  };
};

function ensureUserSettings(username) {
  db.prepare('INSERT OR IGNORE INTO user_settings (username, settings_json) VALUES (?, ?)').run(username, '{}');
}

const getRoleForEmail = (email) => (
  String(email || '').trim().toLowerCase() === config.primaryAdminEmail ? 'admin' : 'member'
);

function createUser({ username, email, password }) {
  const role = getRoleForEmail(email);
  const info = db.prepare(`
    INSERT INTO users (username, email, password, avatar, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, email, password, username.charAt(0).toUpperCase(), role);

  ensureUserSettings(username);
  return findUserByUsername(username);
}

function findUserByUsername(username) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  return mapUser(row);
}

function findUserByEmail(email) {
  const row = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(String(email || '').trim());
  return mapUser(row);
}

function findUserByLogin(login) {
  const value = String(login || '').trim();
  const row = db.prepare('SELECT * FROM users WHERE username = ? OR lower(email) = lower(?)').get(value, value);
  return mapUser(row);
}

function listUsers() {
  return db.prepare('SELECT * FROM users ORDER BY created_at DESC, id DESC').all().map(mapUser);
}

function listAdminUsers() {
  return db.prepare(`
    SELECT
      u.*,
      (SELECT COUNT(*) FROM posts p WHERE p.author = u.username) AS post_count,
      (SELECT COUNT(*) FROM jobs j WHERE j.posted_by = u.username) AS job_count,
      (SELECT COUNT(*) FROM messages m WHERE m.username = u.username) AS message_count,
      (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.username) AS bookmark_count,
      (
        SELECT COUNT(*)
        FROM friendships f
        WHERE (f.requester = u.username OR f.addressee = u.username) AND f.status = 'accepted'
      ) AS friend_count
    FROM users u
    ORDER BY u.created_at DESC, u.id DESC
  `).all().map((row) => ({
    ...mapSafeUser(mapUser(row)),
    postCount: row.post_count || 0,
    jobCount: row.job_count || 0,
    messageCount: row.message_count || 0,
    bookmarkCount: row.bookmark_count || 0,
    friendCount: row.friend_count || 0,
  }));
}

function getFriendship(username, friendUsername) {
  return db.prepare(`
    SELECT *
    FROM friendships
    WHERE (requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?)
  `).get(username, friendUsername, friendUsername, username);
}

function getFriendshipStatus(username, friendUsername) {
  const friendship = getFriendship(username, friendUsername);
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  if (friendship.requester === username) return 'outgoing';
  return 'incoming';
}

function listDiscoverableUsers(viewer) {
  return listUsers()
    .filter((user) => user.username !== viewer)
    .filter((user) => canViewProfile(viewer, user.username))
    .map((user) => ({
      ...mapSafeUser(user),
      friendStatus: viewer ? getFriendshipStatus(viewer, user.username) : 'none',
    }));
}

function canViewProfile(viewer, targetUsername) {
  if (!targetUsername) return false;
  if (viewer === targetUsername) return true;

  const target = findUserByUsername(targetUsername);
  if (!target) return false;
  const viewerUser = viewer ? findUserByUsername(viewer) : null;
  if (viewerUser?.role === 'admin') return true;

  const settings = getUserSettings(targetUsername);
  if (!settings.privateProfile) return true;
  return viewer ? getFriendshipStatus(viewer, targetUsername) === 'friends' : false;
}

function getPublicUserProfile(username, viewer) {
  const user = findUserByUsername(username);
  if (!user) return null;
  if (!canViewProfile(viewer, username)) {
    return {
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      privateProfile: true,
    };
  }
  return mapSafeUser(user);
}

function sendFriendRequest(username, friendUsername) {
  if (!username || !friendUsername || username === friendUsername) {
    return null;
  }
  if (!findUserByUsername(username) || !findUserByUsername(friendUsername)) {
    return null;
  }

  const existing = getFriendship(username, friendUsername);
  if (existing) {
    if (existing.status === 'pending' && existing.addressee === username) {
      return acceptFriendRequest(username, friendUsername);
    }
    return {
      requester: existing.requester,
      addressee: existing.addressee,
      status: existing.status,
    };
  }

  db.prepare('INSERT INTO friendships (requester, addressee, status) VALUES (?, ?, ?)').run(username, friendUsername, 'pending');
  return { requester: username, addressee: friendUsername, status: 'pending' };
}

function acceptFriendRequest(username, requester) {
  const result = db.prepare(`
    UPDATE friendships
    SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
    WHERE requester = ? AND addressee = ? AND status = 'pending'
  `).run(requester, username);

  if (result.changes === 0) {
    return null;
  }

  ensurePrivateRoom(username, requester);
  return { requester, addressee: username, status: 'accepted' };
}

function removeFriendship(username, friendUsername) {
  const result = db.prepare(`
    DELETE FROM friendships
    WHERE (requester = ? AND addressee = ?) OR (requester = ? AND addressee = ?)
  `).run(username, friendUsername, friendUsername, username);
  return { deletedCount: result.changes };
}

function listFriendRequests(username) {
  const incoming = db.prepare(`
    SELECT u.*
    FROM friendships f
    JOIN users u ON u.username = f.requester
    WHERE f.addressee = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(username).map(mapUser).map(mapSafeUser);

  const outgoing = db.prepare(`
    SELECT u.*
    FROM friendships f
    JOIN users u ON u.username = f.addressee
    WHERE f.requester = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(username).map(mapUser).map(mapSafeUser);

  return { incoming, outgoing };
}

function listFriends(username) {
  return db.prepare(`
    SELECT u.*
    FROM friendships f
    JOIN users u ON u.username = CASE WHEN f.requester = ? THEN f.addressee ELSE f.requester END
    WHERE (f.requester = ? OR f.addressee = ?) AND f.status = 'accepted'
    ORDER BY u.username ASC
  `).all(username, username, username).map(mapUser).map(mapSafeUser);
}

function deleteUser(username, { cascadeContent = false } = {}) {
  const user = findUserByUsername(username);
  if (!user) return { changes: 0 };
  if (isPrimaryAdminUser(user)) {
    throw makeHttpError('Primary admin account cannot be deleted', 403);
  }

  const transaction = db.transaction(() => {
    if (cascadeContent) {
      db.prepare(`
        DELETE FROM bookmarks
        WHERE type = 'post' AND post_id IN (SELECT id FROM posts WHERE author = ?)
      `).run(username);
      db.prepare('DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author = ?)').run(username);
      db.prepare('DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE author = ?)').run(username);
      db.prepare('DELETE FROM posts WHERE author = ?').run(username);

      db.prepare(`
        DELETE FROM bookmarks
        WHERE type = 'job' AND post_id IN (SELECT id FROM jobs WHERE posted_by = ?)
      `).run(username);
      db.prepare('DELETE FROM jobs WHERE posted_by = ?').run(username);

      db.prepare(`
        DELETE FROM message_reactions
        WHERE message_id IN (SELECT id FROM messages WHERE username = ?)
      `).run(username);
      db.prepare('DELETE FROM messages WHERE username = ?').run(username);
    }

    db.prepare('DELETE FROM user_tags WHERE user_id = ?').run(user._id);
    db.prepare('DELETE FROM user_settings WHERE username = ?').run(username);
    db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(username);
    db.prepare('DELETE FROM message_reactions WHERE username = ?').run(username);
    db.prepare('DELETE FROM friendships WHERE requester = ? OR addressee = ?').run(username, username);
    db.prepare('DELETE FROM chat_room_members WHERE username = ?').run(username);
    db.prepare('DELETE FROM activities WHERE username = ?').run(username);
    db.prepare('DELETE FROM feedback WHERE username = ?').run(username);
    db.prepare('DELETE FROM users WHERE username = ?').run(username);
  });

  transaction();
  return { changes: 1 };
}

function updateUserProfile(username, updates) {
  const current = findUserByUsername(username);
  if (!current) return null;

  db.prepare(`
    UPDATE users
    SET bio = ?, school = ?, major = ?, avatar = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(
    updates.bio ?? current.bio,
    updates.school ?? current.school,
    updates.major ?? current.major,
    updates.avatar ?? current.avatar,
    updates.coverImage ?? current.coverImage,
    username
  );

  return findUserByUsername(username);
}

function updateUserByAdmin(username, updates = {}, actor = {}) {
  const current = findUserByUsername(username);
  if (!current) return null;

  const reputation = Number.isFinite(Number(updates.reputation))
    ? Math.max(0, Math.round(Number(updates.reputation)))
    : current.reputation;

  const allowedRoles = new Set(['member', 'admin']);
  const requestedRole = String(updates.role || '').trim();
  const roleWasProvided = Object.prototype.hasOwnProperty.call(updates, 'role') && requestedRole;
  const roleWouldChange = roleWasProvided && requestedRole !== current.role;

  if (roleWouldChange && !canManageUserRoles(actor)) {
    throw makeHttpError('Only the primary admin can change user roles', 403);
  }

  const role = isPrimaryAdminUser(current)
    ? 'admin'
    : (allowedRoles.has(requestedRole) ? requestedRole : current.role);

  db.prepare(`
    UPDATE users
    SET reputation = ?, role = ?, bio = ?, school = ?, major = ?, avatar = ?, cover_image = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(
    reputation,
    role,
    updates.bio ?? current.bio,
    updates.school ?? current.school,
    updates.major ?? current.major,
    updates.avatar ?? current.avatar,
    updates.coverImage ?? current.coverImage,
    username
  );

  return mapSafeUser(findUserByUsername(username));
}

function updateUserPassword(username, password) {
  const current = findUserByUsername(username);
  if (!current) return null;

  db.prepare(`
    UPDATE users
    SET password = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(password, username);

  return findUserByUsername(username);
}

function addUserReputation(username, points = 0) {
  const delta = Math.round(Number(points) || 0);
  if (!username || delta === 0) {
    return mapSafeUser(findUserByUsername(username));
  }

  db.prepare(`
    UPDATE users
    SET reputation = max(0, COALESCE(reputation, 0) + ?), updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(delta, username);

  return mapSafeUser(findUserByUsername(username));
}

function getUserSettings(username) {
  ensureUserSettings(username);
  const row = db.prepare('SELECT settings_json FROM user_settings WHERE username = ?').get(username);
  if (!row) {
    return {};
  }

  try {
    const parsed = JSON.parse(row.settings_json || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function updateUserSettings(username, settings) {
  ensureUserSettings(username);
  db.prepare(`
    UPDATE user_settings
    SET settings_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE username = ?
  `).run(JSON.stringify(settings || {}), username);
  return getUserSettings(username);
}

function listUserTags(username) {
  return db.prepare(`
    SELECT t.name, t.color
    FROM user_tags ut
    JOIN users u ON u.id = ut.user_id
    JOIN tags t ON t.id = ut.tag_id
    WHERE u.username = ?
    ORDER BY t.name ASC
  `).all(username);
}

function replaceUserTags(username, tags) {
  const user = findUserByUsername(username);
  if (!user) {
    return [];
  }

  const sanitizedTags = Array.isArray(tags)
    ? tags
      .map((tag) => ({
        name: String(tag?.name || '').trim(),
        color: String(tag?.color || '#3B82F6').trim() || '#3B82F6',
      }))
      .filter((tag) => tag.name)
      .slice(0, 10)
    : [];

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM user_tags WHERE user_id = ?').run(user._id);

    for (const tag of sanitizedTags) {
      let existingTag = db.prepare('SELECT id FROM tags WHERE name = ?').get(tag.name);
      if (!existingTag) {
        const info = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(tag.name, tag.color);
        existingTag = { id: info.lastInsertRowid };
      } else {
        db.prepare('UPDATE tags SET color = ? WHERE id = ?').run(tag.color, existingTag.id);
      }

      db.prepare('INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)').run(user._id, existingTag.id);
    }
  });

  transaction();
  return listUserTags(username);
}

function listTopUsers(limit = 5) {
  return db.prepare('SELECT * FROM users ORDER BY reputation DESC, username ASC LIMIT ?').all(limit).map(mapUser);
}

function promotePrimaryAdminUser() {
  db.prepare(`
    UPDATE users
    SET role = 'admin', updated_at = CURRENT_TIMESTAMP
    WHERE lower(email) = ? AND role <> 'admin'
  `).run(config.primaryAdminEmail);
}

function createAdmin({ username, email, password, role = 'admin' }) {
  db.prepare('INSERT INTO admins (username, email, password, role) VALUES (?, ?, ?, ?)').run(username, email, password, role);
  return findAdminByUsername(username);
}

function findAdminByUsername(username) {
  const row = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  return mapAdmin(row);
}

function findAdminByLogin(login) {
  const value = String(login || '').trim();
  const row = db.prepare('SELECT * FROM admins WHERE username = ? OR lower(email) = lower(?)').get(value, value);
  return mapAdmin(row);
}

function listAdmins() {
  return db.prepare('SELECT * FROM admins ORDER BY created_at DESC, id DESC').all().map(mapAdmin);
}

function createActivity({ username, action, target, icon }) {
  const info = db.prepare('INSERT INTO activities (username, action, target, icon) VALUES (?, ?, ?, ?)').run(username, action, target, icon);
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(info.lastInsertRowid);
  return mapActivity(row);
}

function listActivities(limit) {
  const query = typeof limit === 'number'
    ? db.prepare('SELECT * FROM activities ORDER BY time DESC, id DESC LIMIT ?').all(limit)
    : db.prepare('SELECT * FROM activities ORDER BY time DESC, id DESC').all();
  return query.map(mapActivity);
}

function createPost({ author, title, content }) {
  const info = db.prepare('INSERT INTO posts (author, title, content) VALUES (?, ?, ?)').run(author, title, content);
  return findPostById(info.lastInsertRowid);
}

function listPosts() {
  return db.prepare('SELECT * FROM posts ORDER BY created_at DESC, id DESC').all().map(attachPostMeta);
}

function listPostsByAuthor(author, limit) {
  const rows = typeof limit === 'number'
    ? db.prepare('SELECT * FROM posts WHERE author = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(author, limit)
    : db.prepare('SELECT * FROM posts WHERE author = ? ORDER BY created_at DESC, id DESC').all(author);
  return rows.map(attachPostMeta);
}

function findPostById(id) {
  const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
  return row ? attachPostMeta(row) : null;
}

function togglePostLike(postId, username) {
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND username = ?').get(postId, username);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND username = ?').run(postId, username);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, username) VALUES (?, ?)').run(postId, username);
  }
  return findPostById(postId);
}

function addPostComment(postId, { user, text }) {
  const info = db.prepare('INSERT INTO post_comments (post_id, username, text) VALUES (?, ?, ?)').run(postId, user, text);
  const row = db.prepare('SELECT id, username, text, created_at FROM post_comments WHERE id = ?').get(info.lastInsertRowid);
  return {
    _id: row.id,
    user: row.username,
    text: row.text,
    createdAt: row.created_at,
  };
}

function deletePost(postId) {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM bookmarks WHERE type = 'post' AND post_id = ?").run(postId);
    db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(postId);
    db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(postId);
    return db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
  });
  return transaction();
}

function createJob({ title, company, salary, type, level, location, skills, description, postedBy }) {
  const info = db.prepare(`
    INSERT INTO jobs (title, company, salary, type, level, location, skills, description, posted_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, company, salary, type, level, location, JSON.stringify(skills || []), description, postedBy);
  return findJobById(info.lastInsertRowid);
}

function listJobs() {
  return db.prepare('SELECT * FROM jobs ORDER BY posted_at DESC, id DESC').all().map(mapJob);
}

function findJobById(id) {
  const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  return row ? mapJob(row) : null;
}

function deleteJob(id) {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM bookmarks WHERE type = 'job' AND post_id = ?").run(id);
    return db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  });
  return transaction();
}

function createBookmark({ userId, postId, type }) {
  const info = db.prepare('INSERT INTO bookmarks (user_id, post_id, type) VALUES (?, ?, ?)').run(userId, postId, type);
  const row = db.prepare('SELECT * FROM bookmarks WHERE id = ?').get(info.lastInsertRowid);
  return mapBookmark(row);
}

function findBookmark({ userId, postId, type }) {
  const row = db.prepare('SELECT * FROM bookmarks WHERE user_id = ? AND post_id = ? AND type = ?').get(userId, postId, type);
  return mapBookmark(row);
}

function deleteBookmark({ userId, postId, type }) {
  const result = type
    ? db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ? AND type = ?').run(userId, postId, type)
    : db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND post_id = ?').run(userId, postId);
  return { deletedCount: result.changes };
}

function listBookmarksByUser(userId) {
  return db.prepare('SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId).map(mapBookmark);
}

function createFeedback({ username, type = 'suggestion', title, message, rating = 5 }) {
  const allowedTypes = new Set(['bug', 'suggestion', 'performance', 'security', 'content', 'other']);
  const cleanType = allowedTypes.has(String(type || '').trim()) ? String(type).trim() : 'suggestion';
  const cleanTitle = String(title || '').trim().slice(0, 140);
  const cleanMessage = String(message || '').trim().slice(0, 3000);
  const cleanRating = Number.isFinite(Number(rating))
    ? Math.min(5, Math.max(1, Math.round(Number(rating))))
    : 5;

  if (!username || !cleanTitle || !cleanMessage) {
    return null;
  }

  const info = db.prepare(`
    INSERT INTO feedback (username, type, title, message, rating)
    VALUES (?, ?, ?, ?, ?)
  `).run(username, cleanType, cleanTitle, cleanMessage, cleanRating);

  return findFeedbackById(info.lastInsertRowid);
}

function findFeedbackById(id) {
  const row = db.prepare('SELECT * FROM feedback WHERE id = ?').get(id);
  return mapFeedback(row);
}

function listFeedback({ username } = {}) {
  const rows = username
    ? db.prepare('SELECT * FROM feedback WHERE username = ? ORDER BY created_at DESC, id DESC').all(username)
    : db.prepare('SELECT * FROM feedback ORDER BY created_at DESC, id DESC').all();
  return rows.map(mapFeedback);
}

function updateFeedbackStatus(id, status) {
  const allowedStatuses = new Set(['new', 'reviewing', 'resolved', 'closed']);
  const cleanStatus = allowedStatuses.has(String(status || '').trim()) ? String(status).trim() : null;
  if (!cleanStatus) {
    return null;
  }

  const result = db.prepare(`
    UPDATE feedback
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(cleanStatus, id);

  return result.changes > 0 ? findFeedbackById(id) : null;
}

function deleteFeedback(id) {
  const result = db.prepare('DELETE FROM feedback WHERE id = ?').run(id);
  return { deletedCount: result.changes };
}

function createMessage({ room, username, message }) {
  const info = db.prepare('INSERT INTO messages (room, username, message) VALUES (?, ?, ?)').run(room, username, message);
  const row = db.prepare(`
    SELECT m.*, u.avatar
    FROM messages m
    LEFT JOIN users u ON u.username = m.username
    WHERE m.id = ?
  `).get(info.lastInsertRowid);
  return attachMessageMeta(row);
}

function listMessagesByRoom(room, { limit = 50, before } = {}) {
  if (before) {
    return db.prepare(`
      SELECT m.*, u.avatar
      FROM messages m
      LEFT JOIN users u ON u.username = m.username
      WHERE m.room = ? AND (m.created_at < ? OR (m.created_at = ? AND m.id < ?))
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT ?
    `).all(room, before.createdAt, before.createdAt, before.id, limit).map(attachMessageMeta).reverse();
  }

  return db.prepare(`
    SELECT m.*, u.avatar
    FROM messages m
    LEFT JOIN users u ON u.username = m.username
    WHERE m.room = ?
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?
  `).all(room, limit).map(attachMessageMeta).reverse();
}

function findMessageById(id) {
  const row = db.prepare(`
    SELECT m.*, u.avatar
    FROM messages m
    LEFT JOIN users u ON u.username = m.username
    WHERE m.id = ?
  `).get(id);
  return attachMessageMeta(row);
}

function toggleMessageReaction(messageId, { username, reaction }) {
  const message = findMessageById(messageId);
  if (!message) {
    return null;
  }

  const current = db.prepare('SELECT reaction FROM message_reactions WHERE message_id = ? AND username = ?').get(messageId, username);

  if (current?.reaction === reaction) {
    db.prepare('DELETE FROM message_reactions WHERE message_id = ? AND username = ?').run(messageId, username);
  } else if (current) {
    db.prepare(`
      UPDATE message_reactions
      SET reaction = ?, created_at = CURRENT_TIMESTAMP
      WHERE message_id = ? AND username = ?
    `).run(reaction, messageId, username);
  } else {
    db.prepare('INSERT INTO message_reactions (message_id, username, reaction) VALUES (?, ?, ?)').run(messageId, username, reaction);
  }

  return findMessageById(messageId);
}

function getDeletedRoomIds() {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'deleted_rooms'").get();
  if (!row) return new Set();

  try {
    const parsed = JSON.parse(row.value || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveDeletedRoomIds(roomIds) {
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('deleted_rooms', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(Array.from(roomIds)));
}

function markRoomDeleted(roomId) {
  const deletedRoomIds = getDeletedRoomIds();
  deletedRoomIds.add(String(roomId));
  saveDeletedRoomIds(deletedRoomIds);
}

function unmarkRoomDeleted(roomId) {
  const deletedRoomIds = getDeletedRoomIds();
  if (deletedRoomIds.delete(String(roomId))) {
    saveDeletedRoomIds(deletedRoomIds);
  }
}

function slugifyRoomId(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return slug || `channel-${Date.now()}`;
}

function makeUniquePublicRoomId(name) {
  const base = slugifyRoomId(name);
  let roomId = base;
  let attempt = 0;
  while (findRoomById(roomId)) {
    attempt += 1;
    roomId = `${base}-${crypto.randomBytes(2).toString('hex')}`;
    if (attempt > 10) {
      roomId = `${base}-${Date.now()}`;
      break;
    }
  }
  return roomId;
}

function ensureDefaultChatRooms() {
  const deletedRoomIds = getDeletedRoomIds();
  const rooms = [
    { id: 'announcements', name: 'thông-báo', icon: '#', category: 'Bắt đầu', topic: 'Thông báo quan trọng từ cộng đồng', position: 1, isLocked: 1 },
    { id: 'rules', name: 'quy-định', icon: '#', category: 'Bắt đầu', topic: 'Nội quy và hướng dẫn sử dụng cộng đồng', position: 2, isLocked: 1 },
    { id: 'general', name: 'Chung', icon: '💬', category: 'Cộng đồng', topic: 'Kênh trò chuyện chung cho sinh viên NTTU', position: 10, isLocked: 0 },
    { id: 'introductions', name: 'giới-thiệu', icon: '#', category: 'Cộng đồng', topic: 'Tự giới thiệu và làm quen với mọi người', position: 20, isLocked: 0 },
    { id: 'questions', name: 'hỏi-đáp', icon: '#', category: 'Học tập', topic: 'Đặt câu hỏi học tập và nhờ hỗ trợ', position: 100, isLocked: 0 },
    { id: 'react', name: 'React', icon: '⚛️', category: 'Học tập', topic: 'Trao đổi React, frontend và UI', position: 110, isLocked: 0 },
    { id: 'nodejs', name: 'Node.js', icon: '🟢', category: 'Học tập', topic: 'Node.js, backend và API', position: 120, isLocked: 0 },
    { id: 'python', name: 'Python', icon: '🐍', category: 'Học tập', topic: 'Python, data và automation', position: 130, isLocked: 0 },
    { id: 'assignments', name: 'bài-tập', icon: '#', category: 'Học tập', topic: 'Trao đổi bài tập, tài liệu và deadline', position: 140, isLocked: 0 },
    { id: 'webdesign', name: 'Web Design', icon: '🎨', category: 'Thiết kế', topic: 'UI, UX, web design và portfolio', position: 210, isLocked: 0 },
    { id: 'projects', name: 'dự-án', icon: '#', category: 'Dự án', topic: 'Tìm teammate và khoe sản phẩm đang làm', position: 300, isLocked: 0 },
    { id: 'internships', name: 'thực-tập', icon: '#', category: 'Việc làm', topic: 'Cơ hội thực tập và kinh nghiệm apply', position: 400, isLocked: 0 },
    { id: 'career', name: 'career-talk', icon: '#', category: 'Việc làm', topic: 'CV, phỏng vấn và định hướng nghề nghiệp', position: 410, isLocked: 0 },
    { id: 'events-community', name: 'sự-kiện', icon: '#', category: 'Cộng đồng', topic: 'Sự kiện, workshop và hoạt động sinh viên', position: 500, isLocked: 0 },
    { id: 'random', name: 'chuyện-phiếm', icon: '#', category: 'Giải trí', topic: 'Nơi trò chuyện nhẹ nhàng ngoài giờ học', position: 900, isLocked: 0 },
  ];

  for (const room of rooms) {
    if (deletedRoomIds.has(room.id)) {
      continue;
    }
    db.prepare(`
      INSERT OR IGNORE INTO chat_rooms (id, type, name, icon, category, topic, position, is_locked, created_by)
      VALUES (?, 'public', ?, ?, ?, ?, ?, ?, 'system')
    `).run(room.id, room.name, room.icon, room.category, room.topic, room.position, room.isLocked);
  }
}

function ensurePrivateRoom(username, friendUsername) {
  const user = findUserByUsername(username);
  const friend = findUserByUsername(friendUsername);
  if (!user || !friend || username === friendUsername) {
    return null;
  }

  const roomId = makePrivateRoomId(username, friendUsername);
  const displayName = [username, friendUsername].sort().join(', ');

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT OR IGNORE INTO chat_rooms (id, type, name, icon, created_by)
      VALUES (?, 'private', ?, '👥', ?)
    `).run(roomId, displayName, username);
    db.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, username, role) VALUES (?, ?, ?)').run(roomId, username, 'member');
    db.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, username, role) VALUES (?, ?, ?)').run(roomId, friendUsername, 'member');
  });

  transaction();
  return findRoomById(roomId, username);
}

function createPublicRoom({ name, icon = '#', category = 'Cộng đồng', topic = '', position = 500, isLocked = false, createdBy = 'admin' }) {
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) {
    return null;
  }

  const roomId = makeUniquePublicRoomId(cleanName);
  const safePosition = Number.isFinite(Number(position)) ? Math.round(Number(position)) : 500;

  db.prepare(`
    INSERT INTO chat_rooms (id, type, name, icon, category, topic, position, is_locked, created_by)
    VALUES (?, 'public', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    roomId,
    cleanName,
    String(icon || '#').trim().slice(0, 12) || '#',
    String(category || 'Cộng đồng').trim().slice(0, 60) || 'Cộng đồng',
    String(topic || '').trim().slice(0, 240),
    safePosition,
    isLocked ? 1 : 0,
    createdBy || 'admin'
  );

  unmarkRoomDeleted(roomId);
  return findRoomById(roomId);
}

function createGroupRoom({ name, members = [], createdBy, icon = '👨‍👩‍👧‍👦' }) {
  const owner = findUserByUsername(createdBy);
  if (!owner || !name || !String(name).trim()) {
    return null;
  }

  const friendNames = new Set(listFriends(createdBy).map((friend) => friend.username));
  const canInviteAnyUser = owner.role === 'admin';
  const cleanMembers = Array.from(new Set([createdBy, ...members]
    .map((member) => String(member || '').trim())
    .filter(Boolean)
    .filter((member) => member === createdBy || (findUserByUsername(member) && (canInviteAnyUser || friendNames.has(member))))));

  const roomId = `group:${Date.now()}:${crypto.randomBytes(3).toString('hex')}`;

  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO chat_rooms (id, type, name, icon, created_by)
      VALUES (?, 'group', ?, ?, ?)
    `).run(roomId, String(name).trim().slice(0, 80), icon || '👨‍👩‍👧‍👦', createdBy);

    for (const member of cleanMembers) {
      db.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, username, role) VALUES (?, ?, ?)').run(
        roomId,
        member,
        member === createdBy ? 'owner' : 'member'
      );
    }
  });

  transaction();
  return findRoomById(roomId, createdBy);
}

function getRoomMembership(roomId, username) {
  if (!roomId || !username) return null;
  return db.prepare('SELECT * FROM chat_room_members WHERE room_id = ? AND username = ?').get(roomId, username);
}

function canManageRoom(room, username) {
  const user = findUserByUsername(username);
  if (!room || !user) return false;
  if (user.role === 'admin') return true;
  if (room.createdBy === username) return true;
  return getRoomMembership(room.id, username)?.role === 'owner';
}

function canAccessRoom(roomId, username) {
  const room = findRoomById(roomId, username);
  const user = findUserByUsername(username);
  if (!room || !user) return false;
  if (user.role === 'admin') return true;
  if (room.type === 'public') return true;
  return Boolean(getRoomMembership(roomId, username));
}

function canSendMessageToRoom(roomId, username) {
  const room = findRoomById(roomId, username);
  const user = findUserByUsername(username);
  if (!room || !user || !canAccessRoom(roomId, username)) return false;
  if (user.role === 'admin') return true;
  if (room.isLocked && room.createdBy !== username) return false;
  return true;
}

function canReactToMessage(messageId, username) {
  const message = findMessageById(messageId);
  return Boolean(message && canAccessRoom(message.room, username));
}

function addGroupRoomMembers({ roomId, username, members = [] }) {
  const room = findRoomById(roomId, username);
  if (!room || room.type !== 'group') {
    return { room: null, notFound: true };
  }
  if (!canManageRoom(room, username)) {
    return { room: null, forbidden: true };
  }

  const actor = findUserByUsername(username);
  const friendNames = new Set(listFriends(username).map((friend) => friend.username));
  const canInviteAnyUser = actor?.role === 'admin';
  const currentMembers = new Set((room.members || []).map((member) => member.username));
  const cleanMembers = Array.from(new Set(
    (Array.isArray(members) ? members : [])
      .map((member) => String(member || '').trim())
      .filter(Boolean)
      .filter((member) => !currentMembers.has(member))
      .filter((member) => findUserByUsername(member))
      .filter((member) => canInviteAnyUser || friendNames.has(member))
  ));

  const transaction = db.transaction(() => {
    for (const member of cleanMembers) {
      db.prepare('INSERT OR IGNORE INTO chat_room_members (room_id, username, role) VALUES (?, ?, ?)').run(
        roomId,
        member,
        'member'
      );
    }
  });
  transaction();

  return { room: findRoomById(roomId, username), added: cleanMembers };
}

function findRoomById(roomId, viewer) {
  const row = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(roomId);
  return row ? mapRoom(row, viewer) : null;
}

function listRooms(viewer) {
  ensureDefaultChatRooms();

  if (!viewer) {
    return db.prepare(`
      SELECT *
      FROM chat_rooms
      WHERE type = 'public'
      ORDER BY created_at ASC
    `).all().map((row) => mapRoom(row, viewer));
  }

  const rows = db.prepare(`
    SELECT DISTINCT cr.*
    FROM chat_rooms cr
    LEFT JOIN chat_room_members crm ON crm.room_id = cr.id
    WHERE cr.type = 'public' OR crm.username = ?
    ORDER BY cr.created_at ASC
  `).all(viewer);

  return rows
    .map((row) => mapRoom(row, viewer))
    .sort((a, b) => {
      if (a.type === 'public' && b.type === 'public') {
        return (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name);
      }
      if (a.lastTime && b.lastTime) {
        return new Date(b.lastTime) - new Date(a.lastTime);
      }
      if (a.lastTime) return -1;
      if (b.lastTime) return 1;
      return a.name.localeCompare(b.name);
    });
}

function listAdminRooms() {
  ensureDefaultChatRooms();
  return db.prepare(`
    SELECT
      cr.*,
      COUNT(DISTINCT crm.username) AS member_count,
      COUNT(DISTINCT m.id) AS message_count,
      MAX(m.created_at) AS last_message_at
    FROM chat_rooms cr
    LEFT JOIN chat_room_members crm ON crm.room_id = cr.id
    LEFT JOIN messages m ON m.room = cr.id
    GROUP BY cr.id
    ORDER BY cr.created_at DESC
  `).all().map((row) => ({
    ...mapRoom(row),
    memberCount: row.member_count || 0,
    messageCount: row.message_count || 0,
    lastMessageAt: row.last_message_at || '',
  }));
}

function deleteRoom(roomId) {
  const room = findRoomById(roomId);
  if (!room) {
    return { deletedCount: 0 };
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      DELETE FROM message_reactions
      WHERE message_id IN (SELECT id FROM messages WHERE room = ?)
    `).run(roomId);
    db.prepare('DELETE FROM messages WHERE room = ?').run(roomId);
    db.prepare('DELETE FROM chat_room_members WHERE room_id = ?').run(roomId);
    const result = db.prepare('DELETE FROM chat_rooms WHERE id = ?').run(roomId);
    return { deletedCount: result.changes };
  });

  const result = transaction();
  if (result.deletedCount > 0) {
    markRoomDeleted(roomId);
  }
  return result;
}

function listEvents() {
  return db.prepare('SELECT * FROM events ORDER BY created_at DESC, id DESC').all().map(mapEvent);
}

function createEvent({ icon = '📅', title, date = '', time = '' }) {
  const info = db.prepare(`
    INSERT INTO events (icon, title, date, time)
    VALUES (?, ?, ?, ?)
  `).run(icon || '📅', title, date, time);
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid);
  return mapEvent(row);
}

function updateEvent(id, updates = {}) {
  const current = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!current) return null;

  db.prepare(`
    UPDATE events
    SET icon = ?, title = ?, date = ?, time = ?
    WHERE id = ?
  `).run(
    updates.icon ?? current.icon,
    updates.title ?? current.title,
    updates.date ?? current.date,
    updates.time ?? current.time,
    id
  );

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  return mapEvent(row);
}

function deleteEvent(id) {
  const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
  return { deletedCount: result.changes };
}

function listAnnouncements() {
  return db.prepare('SELECT * FROM announcements ORDER BY created_at DESC, id DESC').all().map(mapAnnouncement);
}

function createAnnouncement({ title, body = '', date = '', createdBy = 'admin', isBroadcast = 1 }) {
  const info = db.prepare(`
    INSERT INTO announcements (title, body, date, created_by, is_broadcast)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, body, date, createdBy, isBroadcast ? 1 : 0);
  const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(info.lastInsertRowid);
  return mapAnnouncement(row);
}

function deleteAnnouncement(id) {
  const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  return { deletedCount: result.changes };
}

function getAdminOverview() {
  const scalar = (sql, ...params) => db.prepare(sql).get(...params).count || 0;
  const totals = {
    users: scalar('SELECT COUNT(*) AS count FROM users'),
    admins: scalar('SELECT COUNT(*) AS count FROM admins'),
    posts: scalar('SELECT COUNT(*) AS count FROM posts'),
    postLikes: scalar('SELECT COUNT(*) AS count FROM post_likes'),
    postComments: scalar('SELECT COUNT(*) AS count FROM post_comments'),
    jobs: scalar('SELECT COUNT(*) AS count FROM jobs'),
    bookmarks: scalar('SELECT COUNT(*) AS count FROM bookmarks'),
    messages: scalar('SELECT COUNT(*) AS count FROM messages'),
    rooms: scalar('SELECT COUNT(*) AS count FROM chat_rooms'),
    friendships: scalar("SELECT COUNT(*) AS count FROM friendships WHERE status = 'accepted'"),
    pendingFriendships: scalar("SELECT COUNT(*) AS count FROM friendships WHERE status = 'pending'"),
    events: scalar('SELECT COUNT(*) AS count FROM events'),
    announcements: scalar('SELECT COUNT(*) AS count FROM announcements'),
    feedback: scalar('SELECT COUNT(*) AS count FROM feedback'),
    openFeedback: scalar("SELECT COUNT(*) AS count FROM feedback WHERE status IN ('new', 'reviewing')"),
  };

  const topRooms = db.prepare(`
    SELECT
      cr.id,
      cr.name,
      cr.type,
      COUNT(m.id) AS message_count,
      MAX(m.created_at) AS last_message_at
    FROM chat_rooms cr
    LEFT JOIN messages m ON m.room = cr.id
    GROUP BY cr.id
    ORDER BY message_count DESC, cr.created_at DESC
    LIMIT 5
  `).all().map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    messageCount: row.message_count || 0,
    lastMessageAt: row.last_message_at || '',
  }));

  return {
    totals,
    recentActivities: listActivities(10),
    recentUsers: listAdminUsers().slice(0, 6),
    topRooms,
    generatedAt: new Date().toISOString(),
    storage: {
      database: 'SQLite',
      status: 'online',
    },
  };
}

function getStatistics() {
  const members = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const messages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const posts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;

  return {
    members,
    messages,
    posts,
    jobs,
  };
}

const defaultTheme = {
  brandName: 'Cộng đồng sinh viên NTTU',
  accent: '#2563eb',
  accentStrong: '#0f766e',
  pageBg: '#f3f6fb',
  sidebarBg: 'rgba(15, 23, 42, 0.96)',
  customCss: '',
};

function getAppTheme() {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = 'theme'").get();
  if (!row) {
    return defaultTheme;
  }

  try {
    const parsed = JSON.parse(row.value || '{}');
    return { ...defaultTheme, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return defaultTheme;
  }
}

function updateAppTheme(updates = {}) {
  const current = getAppTheme();
  const next = {
    ...current,
    brandName: String(updates.brandName ?? current.brandName).trim().slice(0, 80) || defaultTheme.brandName,
    accent: String(updates.accent ?? current.accent).trim() || defaultTheme.accent,
    accentStrong: String(updates.accentStrong ?? current.accentStrong).trim() || defaultTheme.accentStrong,
    pageBg: String(updates.pageBg ?? current.pageBg).trim() || defaultTheme.pageBg,
    sidebarBg: String(updates.sidebarBg ?? current.sidebarBg).trim() || defaultTheme.sidebarBg,
    customCss: String(updates.customCss ?? current.customCss).slice(0, 8000),
  };

  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('theme', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(JSON.stringify(next));

  return getAppTheme();
}

module.exports = {
  db,
  createUser,
  findUserByUsername,
  findUserByEmail,
  findUserByLogin,
  canViewProfile,
  getPublicUserProfile,
  listUsers,
  listAdminUsers,
  listDiscoverableUsers,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  listFriendRequests,
  listFriends,
  deleteUser,
  updateUserProfile,
  updateUserByAdmin,
  updateUserPassword,
  addUserReputation,
  getLevelInfo,
  isPrimaryAdminEmail,
  getUserSettings,
  updateUserSettings,
  listUserTags,
  replaceUserTags,
  listTopUsers,
  promotePrimaryAdminUser,
  createAdmin,
  findAdminByUsername,
  findAdminByLogin,
  listAdmins,
  createActivity,
  listActivities,
  createPost,
  listPosts,
  listPostsByAuthor,
  findPostById,
  togglePostLike,
  addPostComment,
  deletePost,
  createJob,
  listJobs,
  findJobById,
  deleteJob,
  createBookmark,
  findBookmark,
  deleteBookmark,
  listBookmarksByUser,
  createFeedback,
  findFeedbackById,
  listFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  createMessage,
  listMessagesByRoom,
  findMessageById,
  toggleMessageReaction,
  ensurePrivateRoom,
  createPublicRoom,
  createGroupRoom,
  addGroupRoomMembers,
  canAccessRoom,
  canSendMessageToRoom,
  canReactToMessage,
  findRoomById,
  listRooms,
  listAdminRooms,
  deleteRoom,
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAdminOverview,
  getStatistics,
  getAppTheme,
  updateAppTheme,
};
