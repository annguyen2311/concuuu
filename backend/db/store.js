const crypto = require('crypto');
const config = require('../config');
const { pool } = require('./index');

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
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

const attachMessageMeta = async (row) => {
  if (!row) return null;

  const { rows: reactionRows } = await pool.query(`
    SELECT username, reaction, created_at
    FROM message_reactions
    WHERE message_id = $1
    ORDER BY created_at ASC, username ASC
  `, [row.id]);

  const reactions = reactionRows.map((reaction) => ({
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

const attachPostMeta = async (row) => {
  const [likesResult, commentsResult] = await Promise.all([
    pool.query('SELECT username FROM post_likes WHERE post_id = $1 ORDER BY created_at ASC, username ASC', [row.id]),
    pool.query('SELECT id, username, text, created_at FROM post_comments WHERE post_id = $1 ORDER BY created_at ASC, id ASC', [row.id]),
  ]);

  const likes = likesResult.rows.map((item) => item.username);
  const comments = commentsResult.rows.map((comment) => ({
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

const mapRoom = async (row, viewer) => {
  const [latestResult, memberRowsResult, countResult] = await Promise.all([
    pool.query(`
      SELECT username, message, created_at
      FROM messages
      WHERE room = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `, [row.id]),
    pool.query(`
      SELECT u.username, u.avatar, crm.role
      FROM chat_room_members crm
      LEFT JOIN users u ON u.username = crm.username
      WHERE crm.room_id = $1
      ORDER BY CASE crm.role WHEN 'owner' THEN 0 ELSE 1 END, crm.username ASC
    `, [row.id]),
    pool.query('SELECT COUNT(*) as count FROM messages WHERE room = $1', [row.id]),
  ]);

  const latest = latestResult.rows[0];
  const members = memberRowsResult.rows.map((member) => ({
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
    messageCount: parseInt(countResult.rows[0].count, 10) || 0,
    members,
  };
};

async function ensureUserSettings(username) {
  await pool.query(
    'INSERT INTO user_settings (username, settings_json) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
    [username, '{}']
  );
}

const getRoleForEmail = (email) => (
  String(email || '').trim().toLowerCase() === config.primaryAdminEmail ? 'admin' : 'member'
);

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function createUser({ username, email, password }) {
  const role = getRoleForEmail(email);
  await pool.query(`
    INSERT INTO users (username, email, password, avatar, role)
    VALUES ($1, $2, $3, $4, $5)
  `, [username, email, password, username.charAt(0).toUpperCase(), role]);

  await ensureUserSettings(username);
  return findUserByUsername(username);
}

async function findUserByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return mapUser(rows[0]);
}

async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email || '').trim()]);
  return mapUser(rows[0]);
}

async function findUserByLogin(login) {
  const value = String(login || '').trim();
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 OR lower(email) = lower($1)', [value]);
  return mapUser(rows[0]);
}

async function listUsers() {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY created_at DESC, id DESC');
  return rows.map(mapUser);
}

async function listAdminUsers() {
  const { rows } = await pool.query(`
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
  `);

  return rows.map((row) => ({
    ...mapSafeUser(mapUser(row)),
    postCount: parseInt(row.post_count, 10) || 0,
    jobCount: parseInt(row.job_count, 10) || 0,
    messageCount: parseInt(row.message_count, 10) || 0,
    bookmarkCount: parseInt(row.bookmark_count, 10) || 0,
    friendCount: parseInt(row.friend_count, 10) || 0,
  }));
}

async function getFriendship(username, friendUsername) {
  const { rows } = await pool.query(`
    SELECT *
    FROM friendships
    WHERE (requester = $1 AND addressee = $2) OR (requester = $2 AND addressee = $1)
  `, [username, friendUsername]);
  return rows[0] || null;
}

async function getFriendshipStatus(username, friendUsername) {
  const friendship = await getFriendship(username, friendUsername);
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  if (friendship.requester === username) return 'outgoing';
  return 'incoming';
}

async function listDiscoverableUsers(viewer) {
  const users = await listUsers();
  const filtered = users.filter((user) => user.username !== viewer);

  const viewerUser = viewer ? await findUserByUsername(viewer) : null;
  const viewerIsAdmin = viewerUser?.role === 'admin';

  const results = [];
  for (const user of filtered) {
    if (viewerIsAdmin || !user.settings?.privateProfile) {
      const friendStatus = viewer ? await getFriendshipStatus(viewer, user.username) : 'none';
      results.push({
        ...mapSafeUser(user),
        friendStatus,
      });
    }
  }
  return results;
}

async function canViewProfile(viewer, targetUsername) {
  if (!targetUsername) return false;
  if (viewer === targetUsername) return true;

  const target = await findUserByUsername(targetUsername);
  if (!target) return false;
  const viewerUser = viewer ? await findUserByUsername(viewer) : null;
  if (viewerUser?.role === 'admin') return true;

  const settings = await getUserSettings(targetUsername);
  if (!settings.privateProfile) return true;
  return viewer ? (await getFriendshipStatus(viewer, targetUsername)) === 'friends' : false;
}

async function getPublicUserProfile(username, viewer) {
  const user = await findUserByUsername(username);
  if (!user) return null;
  if (!(await canViewProfile(viewer, username))) {
    return {
      username: user.username,
      avatar: user.avatar,
      role: user.role,
      privateProfile: true,
    };
  }
  return mapSafeUser(user);
}

async function sendFriendRequest(username, friendUsername) {
  if (!username || !friendUsername || username === friendUsername) {
    return null;
  }
  if (!await findUserByUsername(username) || !await findUserByUsername(friendUsername)) {
    return null;
  }

  const existing = await getFriendship(username, friendUsername);
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

  await pool.query('INSERT INTO friendships (requester, addressee, status) VALUES ($1, $2, $3) ON CONFLICT (requester, addressee) DO NOTHING', [username, friendUsername, 'pending']);
  return { requester: username, addressee: friendUsername, status: 'pending' };
}

async function acceptFriendRequest(username, requester) {
  const { rowCount } = await pool.query(`
    UPDATE friendships
    SET status = 'accepted', updated_at = NOW()
    WHERE requester = $1 AND addressee = $2 AND status = 'pending'
  `, [requester, username]);

  if (rowCount === 0) {
    return null;
  }

  await ensurePrivateRoom(username, requester);
  return { requester, addressee: username, status: 'accepted' };
}

async function removeFriendship(username, friendUsername) {
  const { rowCount } = await pool.query(`
    DELETE FROM friendships
    WHERE (requester = $1 AND addressee = $2) OR (requester = $2 AND addressee = $1)
  `, [username, friendUsername]);
  return { deletedCount: rowCount };
}

async function listFriendRequests(username) {
  const [incomingResult, outgoingResult] = await Promise.all([
    pool.query(`
      SELECT u.*
      FROM friendships f
      JOIN users u ON u.username = f.requester
      WHERE f.addressee = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [username]),
    pool.query(`
      SELECT u.*
      FROM friendships f
      JOIN users u ON u.username = f.addressee
      WHERE f.requester = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [username]),
  ]);

  const incoming = incomingResult.rows.map(mapUser).map(mapSafeUser);
  const outgoing = outgoingResult.rows.map(mapUser).map(mapSafeUser);

  return { incoming, outgoing };
}

async function listFriends(username) {
  const { rows } = await pool.query(`
    SELECT u.*
    FROM friendships f
    JOIN users u ON u.username = CASE WHEN f.requester = $1 THEN f.addressee ELSE f.requester END
    WHERE (f.requester = $1 OR f.addressee = $1) AND f.status = 'accepted'
    ORDER BY u.username ASC
  `, [username]);
  return rows.map(mapUser).map(mapSafeUser);
}

async function deleteUser(username, { cascadeContent = false } = {}) {
  const user = await findUserByUsername(username);
  if (!user) return { deletedCount: 0 };
  if (isPrimaryAdminUser(user)) {
    throw makeHttpError('Primary admin account cannot be deleted', 403);
  }

  await withTransaction(async (client) => {
    if (cascadeContent) {
      await client.query(`
        DELETE FROM bookmarks
        WHERE type = 'post' AND post_id IN (SELECT id FROM posts WHERE author = $1)
      `, [username]);
      await client.query('DELETE FROM post_likes WHERE post_id IN (SELECT id FROM posts WHERE author = $1)', [username]);
      await client.query('DELETE FROM post_comments WHERE post_id IN (SELECT id FROM posts WHERE author = $1)', [username]);
      await client.query('DELETE FROM posts WHERE author = $1', [username]);

      await client.query(`
        DELETE FROM bookmarks
        WHERE type = 'job' AND post_id IN (SELECT id FROM jobs WHERE posted_by = $1)
      `, [username]);
      await client.query('DELETE FROM jobs WHERE posted_by = $1', [username]);

      await client.query(`
        DELETE FROM message_reactions
        WHERE message_id IN (SELECT id FROM messages WHERE username = $1)
      `, [username]);
      await client.query('DELETE FROM messages WHERE username = $1', [username]);
    }

    await client.query('DELETE FROM user_tags WHERE user_id = $1', [user._id]);
    await client.query('DELETE FROM user_settings WHERE username = $1', [username]);
    await client.query('DELETE FROM bookmarks WHERE user_id = $1', [username]);
    await client.query('DELETE FROM message_reactions WHERE username = $1', [username]);
    await client.query('DELETE FROM friendships WHERE requester = $1 OR addressee = $1', [username]);
    await client.query('DELETE FROM chat_room_members WHERE username = $1', [username]);
    await client.query('DELETE FROM activities WHERE username = $1', [username]);
    await client.query('DELETE FROM feedback WHERE username = $1', [username]);
    await client.query('DELETE FROM users WHERE username = $1', [username]);
  });

  return { deletedCount: 1 };
}

async function updateUserProfile(username, updates) {
  const current = await findUserByUsername(username);
  if (!current) return null;

  await pool.query(`
    UPDATE users
    SET bio = $1, school = $2, major = $3, avatar = $4, cover_image = $5, updated_at = NOW()
    WHERE username = $6
  `, [
    updates.bio ?? current.bio,
    updates.school ?? current.school,
    updates.major ?? current.major,
    updates.avatar ?? current.avatar,
    updates.coverImage ?? current.coverImage,
    username,
  ]);

  return findUserByUsername(username);
}

async function updateUserByAdmin(username, updates = {}, actor = {}) {
  const current = await findUserByUsername(username);
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

  await pool.query(`
    UPDATE users
    SET reputation = $1, role = $2, bio = $3, school = $4, major = $5, avatar = $6, cover_image = $7, updated_at = NOW()
    WHERE username = $8
  `, [
    reputation,
    role,
    updates.bio ?? current.bio,
    updates.school ?? current.school,
    updates.major ?? current.major,
    updates.avatar ?? current.avatar,
    updates.coverImage ?? current.coverImage,
    username,
  ]);

  return mapSafeUser(await findUserByUsername(username));
}

async function updateUserPassword(username, password) {
  const current = await findUserByUsername(username);
  if (!current) return null;

  await pool.query(`
    UPDATE users
    SET password = $1, updated_at = NOW()
    WHERE username = $2
  `, [password, username]);

  return findUserByUsername(username);
}

async function addUserReputation(username, points = 0) {
  const delta = Math.round(Number(points) || 0);
  if (!username || delta === 0) {
    return mapSafeUser(await findUserByUsername(username));
  }

  await pool.query(`
    UPDATE users
    SET reputation = GREATEST(0, COALESCE(reputation, 0) + $1), updated_at = NOW()
    WHERE username = $2
  `, [delta, username]);

  return mapSafeUser(await findUserByUsername(username));
}

async function getUserSettings(username) {
  await ensureUserSettings(username);
  const { rows } = await pool.query('SELECT settings_json FROM user_settings WHERE username = $1', [username]);
  if (!rows[0]) {
    return {};
  }

  try {
    const parsed = JSON.parse(rows[0].settings_json || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function updateUserSettings(username, settings) {
  await ensureUserSettings(username);
  await pool.query(`
    UPDATE user_settings
    SET settings_json = $1, updated_at = NOW()
    WHERE username = $2
  `, [JSON.stringify(settings || {}), username]);
  return getUserSettings(username);
}

async function listUserTags(username) {
  const { rows } = await pool.query(`
    SELECT t.name, t.color
    FROM user_tags ut
    JOIN users u ON u.id = ut.user_id
    JOIN tags t ON t.id = ut.tag_id
    WHERE u.username = $1
    ORDER BY t.name ASC
  `, [username]);
  return rows;
}

async function replaceUserTags(username, tags) {
  const user = await findUserByUsername(username);
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

  await withTransaction(async (client) => {
    await client.query('DELETE FROM user_tags WHERE user_id = $1', [user._id]);

    for (const tag of sanitizedTags) {
      const { rows: existing } = await client.query('SELECT id FROM tags WHERE name = $1', [tag.name]);
      let tagId;
      if (existing.length === 0) {
        const { rows: inserted } = await client.query(
          'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING id',
          [tag.name, tag.color]
        );
        tagId = inserted[0].id;
      } else {
        tagId = existing[0].id;
        await client.query('UPDATE tags SET color = $1 WHERE id = $2', [tag.color, tagId]);
      }

      await client.query('INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)', [user._id, tagId]);
    }
  });

  return listUserTags(username);
}

async function listTopUsers(limit = 5) {
  const { rows } = await pool.query('SELECT * FROM users ORDER BY reputation DESC, username ASC LIMIT $1', [limit]);
  return rows.map(mapUser);
}

async function promotePrimaryAdminUser() {
  await pool.query(`
    UPDATE users
    SET role = 'admin', updated_at = NOW()
    WHERE lower(email) = $1 AND role <> 'admin'
  `, [config.primaryAdminEmail]);
}

async function createAdmin({ username, email, password, role = 'admin' }) {
  await pool.query('INSERT INTO admins (username, email, password, role) VALUES ($1, $2, $3, $4)', [username, email, password, role]);
  return findAdminByUsername(username);
}

async function findAdminByUsername(username) {
  const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
  return mapAdmin(rows[0]);
}

async function findAdminByLogin(login) {
  const value = String(login || '').trim();
  const { rows } = await pool.query('SELECT * FROM admins WHERE username = $1 OR lower(email) = lower($1)', [value]);
  return mapAdmin(rows[0]);
}

async function listAdmins() {
  const { rows } = await pool.query('SELECT * FROM admins ORDER BY created_at DESC, id DESC');
  return rows.map(mapAdmin);
}

async function createActivity({ username, action, target, icon }) {
  const { rows } = await pool.query(
    'INSERT INTO activities (username, action, target, icon) VALUES ($1, $2, $3, $4) RETURNING *',
    [username, action, target, icon]
  );
  return mapActivity(rows[0]);
}

async function listActivities(limit) {
  const { rows } = typeof limit === 'number'
    ? await pool.query('SELECT * FROM activities ORDER BY time DESC, id DESC LIMIT $1', [limit])
    : await pool.query('SELECT * FROM activities ORDER BY time DESC, id DESC');
  return rows.map(mapActivity);
}

async function createPost({ author, title, content }) {
  const { rows } = await pool.query(
    'INSERT INTO posts (author, title, content) VALUES ($1, $2, $3) RETURNING id',
    [author, title, content]
  );
  return findPostById(rows[0].id);
}

async function listPosts() {
  const { rows } = await pool.query('SELECT * FROM posts ORDER BY created_at DESC, id DESC');
  return Promise.all(rows.map(attachPostMeta));
}

async function listPostsByAuthor(author, limit) {
  const { rows } = typeof limit === 'number'
    ? await pool.query('SELECT * FROM posts WHERE author = $1 ORDER BY created_at DESC, id DESC LIMIT $2', [author, limit])
    : await pool.query('SELECT * FROM posts WHERE author = $1 ORDER BY created_at DESC, id DESC', [author]);
  return Promise.all(rows.map(attachPostMeta));
}

async function findPostById(id) {
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return rows[0] ? attachPostMeta(rows[0]) : null;
}

async function togglePostLike(postId, username) {
  const { rows: existing } = await pool.query('SELECT 1 FROM post_likes WHERE post_id = $1 AND username = $2', [postId, username]);
  if (existing.length > 0) {
    await pool.query('DELETE FROM post_likes WHERE post_id = $1 AND username = $2', [postId, username]);
  } else {
    await pool.query('INSERT INTO post_likes (post_id, username) VALUES ($1, $2) ON CONFLICT (post_id, username) DO NOTHING', [postId, username]);
  }
  return findPostById(postId);
}

async function addPostComment(postId, { user, text }) {
  const { rows } = await pool.query(
    'INSERT INTO post_comments (post_id, username, text) VALUES ($1, $2, $3) RETURNING id, username, text, created_at',
    [postId, user, text]
  );
  const row = rows[0];
  return {
    _id: row.id,
    user: row.username,
    text: row.text,
    createdAt: row.created_at,
  };
}

async function deletePost(postId) {
  return withTransaction(async (client) => {
    await client.query("DELETE FROM bookmarks WHERE type = 'post' AND post_id = $1", [postId]);
    await client.query('DELETE FROM post_likes WHERE post_id = $1', [postId]);
    await client.query('DELETE FROM post_comments WHERE post_id = $1', [postId]);
    const { rowCount } = await client.query('DELETE FROM posts WHERE id = $1', [postId]);
    return { deletedCount: rowCount };
  });
}

async function createJob({ title, company, salary, type, level, location, skills, description, postedBy }) {
  const { rows } = await pool.query(`
    INSERT INTO jobs (title, company, salary, type, level, location, skills, description, posted_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
  `, [title, company, salary, type, level, location, JSON.stringify(skills || []), description, postedBy]);
  return findJobById(rows[0].id);
}

async function listJobs() {
  const { rows } = await pool.query('SELECT * FROM jobs ORDER BY posted_at DESC, id DESC');
  return rows.map(mapJob);
}

async function findJobById(id) {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
  return rows[0] ? mapJob(rows[0]) : null;
}

async function deleteJob(id) {
  return withTransaction(async (client) => {
    await client.query("DELETE FROM bookmarks WHERE type = 'job' AND post_id = $1", [id]);
    const { rowCount } = await client.query('DELETE FROM jobs WHERE id = $1', [id]);
    return { deletedCount: rowCount };
  });
}

async function createBookmark({ userId, postId, type }) {
  const { rows } = await pool.query(
    'INSERT INTO bookmarks (user_id, post_id, type) VALUES ($1, $2, $3) ON CONFLICT (user_id, post_id, type) DO NOTHING RETURNING *',
    [userId, postId, type]
  );
  return rows[0] ? mapBookmark(rows[0]) : null;
}

async function findBookmark({ userId, postId, type }) {
  const { rows } = await pool.query('SELECT * FROM bookmarks WHERE user_id = $1 AND post_id = $2 AND type = $3', [userId, postId, type]);
  return mapBookmark(rows[0]);
}

async function deleteBookmark({ userId, postId, type }) {
  const { rowCount } = type
    ? await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2 AND type = $3', [userId, postId, type])
    : await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
  return { deletedCount: rowCount };
}

async function listBookmarksByUser(userId) {
  const { rows } = await pool.query('SELECT * FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC, id DESC', [userId]);
  return rows.map(mapBookmark);
}

async function createFeedback({ username, type = 'suggestion', title, message, rating = 5 }) {
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

  const { rows } = await pool.query(`
    INSERT INTO feedback (username, type, title, message, rating)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [username, cleanType, cleanTitle, cleanMessage, cleanRating]);

  return findFeedbackById(rows[0].id);
}

async function findFeedbackById(id) {
  const { rows } = await pool.query('SELECT * FROM feedback WHERE id = $1', [id]);
  return mapFeedback(rows[0]);
}

async function listFeedback({ username } = {}) {
  const { rows } = username
    ? await pool.query('SELECT * FROM feedback WHERE username = $1 ORDER BY created_at DESC, id DESC', [username])
    : await pool.query('SELECT * FROM feedback ORDER BY created_at DESC, id DESC');
  return rows.map(mapFeedback);
}

async function updateFeedbackStatus(id, status) {
  const allowedStatuses = new Set(['new', 'reviewing', 'resolved', 'closed']);
  const cleanStatus = allowedStatuses.has(String(status || '').trim()) ? String(status).trim() : null;
  if (!cleanStatus) {
    return null;
  }

  const { rowCount } = await pool.query(`
    UPDATE feedback
    SET status = $1, updated_at = NOW()
    WHERE id = $2
  `, [cleanStatus, id]);

  return rowCount > 0 ? findFeedbackById(id) : null;
}

async function deleteFeedback(id) {
  const { rowCount } = await pool.query('DELETE FROM feedback WHERE id = $1', [id]);
  return { deletedCount: rowCount };
}

async function createMessage({ room, username, message }) {
  const { rows } = await pool.query(
    'INSERT INTO messages (room, username, message) VALUES ($1, $2, $3) RETURNING id',
    [room, username, message]
  );
  const { rows: msgRows } = await pool.query(`
    SELECT m.*, u.avatar
    FROM messages m
    LEFT JOIN users u ON u.username = m.username
    WHERE m.id = $1
  `, [rows[0].id]);
  return attachMessageMeta(msgRows[0]);
}

async function listMessagesByRoom(room, { limit = 50, before } = {}) {
  let rows;
  if (before) {
    const result = await pool.query(`
      SELECT m.*, u.avatar
      FROM messages m
      LEFT JOIN users u ON u.username = m.username
      WHERE m.room = $1 AND (m.created_at < $2 OR (m.created_at = $2 AND m.id < $3))
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $4
    `, [room, before.createdAt, before.id, limit]);
    rows = result.rows;
  } else {
    const result = await pool.query(`
      SELECT m.*, u.avatar
      FROM messages m
      LEFT JOIN users u ON u.username = m.username
      WHERE m.room = $1
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $2
    `, [room, limit]);
    rows = result.rows;
  }

  const messages = await Promise.all(rows.map(attachMessageMeta));
  return messages.reverse();
}

async function findMessageById(id) {
  const { rows } = await pool.query(`
    SELECT m.*, u.avatar
    FROM messages m
    LEFT JOIN users u ON u.username = m.username
    WHERE m.id = $1
  `, [id]);
  return attachMessageMeta(rows[0]);
}

async function toggleMessageReaction(messageId, { username, reaction }) {
  const message = await findMessageById(messageId);
  if (!message) {
    return null;
  }

  const { rows: current } = await pool.query(
    'SELECT reaction FROM message_reactions WHERE message_id = $1 AND username = $2',
    [messageId, username]
  );

  if (current[0]?.reaction === reaction) {
    await pool.query('DELETE FROM message_reactions WHERE message_id = $1 AND username = $2', [messageId, username]);
  } else if (current[0]) {
    await pool.query(`
      UPDATE message_reactions
      SET reaction = $1, created_at = NOW()
      WHERE message_id = $2 AND username = $3
    `, [reaction, messageId, username]);
  } else {
    await pool.query('INSERT INTO message_reactions (message_id, username, reaction) VALUES ($1, $2, $3) ON CONFLICT (message_id, username) DO UPDATE SET reaction = $3, created_at = NOW()', [messageId, username, reaction]);
  }

  return findMessageById(messageId);
}

async function getDeletedRoomIds() {
  const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = 'deleted_rooms'");
  if (!rows[0]) return new Set();

  try {
    const parsed = JSON.parse(rows[0].value || '[]');
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

async function saveDeletedRoomIds(roomIds) {
  await pool.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('deleted_rooms', $1, NOW())
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [JSON.stringify(Array.from(roomIds))]);
}

async function markRoomDeleted(roomId) {
  const deletedRoomIds = await getDeletedRoomIds();
  deletedRoomIds.add(String(roomId));
  await saveDeletedRoomIds(deletedRoomIds);
}

async function unmarkRoomDeleted(roomId) {
  const deletedRoomIds = await getDeletedRoomIds();
  if (deletedRoomIds.delete(String(roomId))) {
    await saveDeletedRoomIds(deletedRoomIds);
  }
}

function slugifyRoomId(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return slug || `channel-${Date.now()}`;
}

async function makeUniquePublicRoomId(name) {
  const base = slugifyRoomId(name);
  let roomId = base;
  let attempt = 0;
  while (await findRoomById(roomId)) {
    attempt += 1;
    roomId = `${base}-${crypto.randomBytes(2).toString('hex')}`;
    if (attempt > 10) {
      roomId = `${base}-${Date.now()}`;
      break;
    }
  }
  return roomId;
}

let defaultsEnsured = false;

async function ensureDefaultChatRooms() {
  if (defaultsEnsured) return;
  const deletedRoomIds = await getDeletedRoomIds();
  const rooms = [
    { id: 'announcements', name: 'thông-báo', icon: '#', category: 'Bắt đầu', topic: 'Thông báo quan trọng từ cộng đồng', position: 1, isLocked: true },
    { id: 'rules', name: 'quy-định', icon: '#', category: 'Bắt đầu', topic: 'Nội quy và hướng dẫn sử dụng cộng đồng', position: 2, isLocked: true },
    { id: 'general', name: 'Chung', icon: '💬', category: 'Cộng đồng', topic: 'Kênh trò chuyện chung cho sinh viên NTTU', position: 10, isLocked: false },
    { id: 'introductions', name: 'giới-thiệu', icon: '#', category: 'Cộng đồng', topic: 'Tự giới thiệu và làm quen với mọi người', position: 20, isLocked: false },
    { id: 'questions', name: 'hỏi-đáp', icon: '#', category: 'Học tập', topic: 'Đặt câu hỏi học tập và nhờ hỗ trợ', position: 100, isLocked: false },
    { id: 'react', name: 'React', icon: '⚛️', category: 'Học tập', topic: 'Trao đổi React, frontend và UI', position: 110, isLocked: false },
    { id: 'nodejs', name: 'Node.js', icon: '🟢', category: 'Học tập', topic: 'Node.js, backend và API', position: 120, isLocked: false },
    { id: 'python', name: 'Python', icon: '🐍', category: 'Học tập', topic: 'Python, data và automation', position: 130, isLocked: false },
    { id: 'assignments', name: 'bài-tập', icon: '#', category: 'Học tập', topic: 'Trao đổi bài tập, tài liệu và deadline', position: 140, isLocked: false },
    { id: 'webdesign', name: 'Web Design', icon: '🎨', category: 'Thiết kế', topic: 'UI, UX, web design và portfolio', position: 210, isLocked: false },
    { id: 'projects', name: 'dự-án', icon: '#', category: 'Dự án', topic: 'Tìm teammate và khoe sản phẩm đang làm', position: 300, isLocked: false },
    { id: 'internships', name: 'thực-tập', icon: '#', category: 'Việc làm', topic: 'Cơ hội thực tập và kinh nghiệm apply', position: 400, isLocked: false },
    { id: 'career', name: 'career-talk', icon: '#', category: 'Việc làm', topic: 'CV, phỏng vấn và định hướng nghề nghiệp', position: 410, isLocked: false },
    { id: 'events-community', name: 'sự-kiện', icon: '#', category: 'Cộng đồng', topic: 'Sự kiện, workshop và hoạt động sinh viên', position: 500, isLocked: false },
    { id: 'random', name: 'chuyện-phiếm', icon: '#', category: 'Giải trí', topic: 'Nơi trò chuyện nhẹ nhàng ngoài giờ học', position: 900, isLocked: false },
  ];

  for (const room of rooms) {
    if (deletedRoomIds.has(room.id)) {
      continue;
    }
    await pool.query(`
      INSERT INTO chat_rooms (id, type, name, icon, category, topic, position, is_locked, created_by)
      VALUES ($1, 'public', $2, $3, $4, $5, $6, $7, 'system')
      ON CONFLICT (id) DO NOTHING
    `, [room.id, room.name, room.icon, room.category, room.topic, room.position, room.isLocked]);
  }
  defaultsEnsured = true;
}

async function ensurePrivateRoom(username, friendUsername) {
  const user = await findUserByUsername(username);
  const friend = await findUserByUsername(friendUsername);
  if (!user || !friend || username === friendUsername) {
    return null;
  }

  const roomId = makePrivateRoomId(username, friendUsername);
  const displayName = [username, friendUsername].sort().join(', ');

  await withTransaction(async (client) => {
    await client.query(`
      INSERT INTO chat_rooms (id, type, name, icon, created_by)
      VALUES ($1, 'private', $2, '👥', $3)
      ON CONFLICT (id) DO NOTHING
    `, [roomId, displayName, username]);
    await client.query('INSERT INTO chat_room_members (room_id, username, role) VALUES ($1, $2, $3) ON CONFLICT (room_id, username) DO NOTHING', [roomId, username, 'member']);
    await client.query('INSERT INTO chat_room_members (room_id, username, role) VALUES ($1, $2, $3) ON CONFLICT (room_id, username) DO NOTHING', [roomId, friendUsername, 'member']);
  });

  return findRoomById(roomId, username);
}

async function createPublicRoom({ name, icon = '#', category = 'Cộng đồng', topic = '', position = 500, isLocked = false, createdBy = 'admin' }) {
  const cleanName = String(name || '').trim().slice(0, 80);
  if (!cleanName) {
    return null;
  }

  const roomId = await makeUniquePublicRoomId(cleanName);
  const safePosition = Number.isFinite(Number(position)) ? Math.round(Number(position)) : 500;

  await pool.query(`
    INSERT INTO chat_rooms (id, type, name, icon, category, topic, position, is_locked, created_by)
    VALUES ($1, 'public', $2, $3, $4, $5, $6, $7, $8)
  `, [
    roomId,
    cleanName,
    String(icon || '#').trim().slice(0, 12) || '#',
    String(category || 'Cộng đồng').trim().slice(0, 60) || 'Cộng đồng',
    String(topic || '').trim().slice(0, 240),
    safePosition,
    isLocked,
    createdBy || 'admin',
  ]);

  await unmarkRoomDeleted(roomId);
  return findRoomById(roomId);
}

async function createGroupRoom({ name, members = [], createdBy, icon = '👨‍👩‍👧‍👦' }) {
  const owner = await findUserByUsername(createdBy);
  if (!owner || !name || !String(name).trim()) {
    return null;
  }

  const friendNames = new Set((await listFriends(createdBy)).map((friend) => friend.username));
  const canInviteAnyUser = owner.role === 'admin';

  const memberChecks = [createdBy, ...members]
    .map((member) => String(member || '').trim())
    .filter(Boolean)
    .filter((member) => member === createdBy || canInviteAnyUser || friendNames.has(member));

  const cleanMembers = [];
  for (const member of [...new Set(memberChecks)]) {
    if (member === createdBy) {
      cleanMembers.push(member);
      continue;
    }
    const user = await findUserByUsername(member);
    if (user && (canInviteAnyUser || friendNames.has(member))) {
      cleanMembers.push(member);
    }
  }

  const roomId = `group:${Date.now()}:${crypto.randomBytes(3).toString('hex')}`;

  await withTransaction(async (client) => {
    await client.query(`
      INSERT INTO chat_rooms (id, type, name, icon, created_by)
      VALUES ($1, 'group', $2, $3, $4)
    `, [roomId, String(name).trim().slice(0, 80), icon || '👨‍👩‍👧‍👦', createdBy]);

    for (const member of cleanMembers) {
      await client.query(
        'INSERT INTO chat_room_members (room_id, username, role) VALUES ($1, $2, $3) ON CONFLICT (room_id, username) DO NOTHING',
        [roomId, member, member === createdBy ? 'owner' : 'member']
      );
    }
  });

  return findRoomById(roomId, createdBy);
}

async function getRoomMembership(roomId, username) {
  if (!roomId || !username) return null;
  const { rows } = await pool.query('SELECT * FROM chat_room_members WHERE room_id = $1 AND username = $2', [roomId, username]);
  return rows[0] || null;
}

async function canManageRoom(room, username) {
  const user = await findUserByUsername(username);
  if (!room || !user) return false;
  if (user.role === 'admin') return true;
  if (room.createdBy === username) return true;
  const membership = await getRoomMembership(room.id, username);
  return membership?.role === 'owner';
}

async function canAccessRoom(roomId, username) {
  const room = await findRoomById(roomId, username);
  const user = await findUserByUsername(username);
  if (!room || !user) return false;
  if (user.role === 'admin') return true;
  if (room.type === 'public') return true;
  return Boolean(await getRoomMembership(roomId, username));
}

async function canSendMessageToRoom(roomId, username) {
  const room = await findRoomById(roomId, username);
  const user = await findUserByUsername(username);
  if (!room || !user || !await canAccessRoom(roomId, username)) return false;
  if (user.role === 'admin') return true;
  if (room.isLocked && room.createdBy !== username) return false;
  return true;
}

async function canReactToMessage(messageId, username) {
  const message = await findMessageById(messageId);
  return Boolean(message && await canAccessRoom(message.room, username));
}

async function addGroupRoomMembers({ roomId, username, members = [] }) {
  const room = await findRoomById(roomId, username);
  if (!room || room.type !== 'group') {
    return { room: null, notFound: true };
  }
  if (!await canManageRoom(room, username)) {
    return { room: null, forbidden: true };
  }

  const actor = await findUserByUsername(username);
  const friendNames = new Set((await listFriends(username)).map((friend) => friend.username));
  const canInviteAnyUser = actor?.role === 'admin';
  const currentMembers = new Set((room.members || []).map((member) => member.username));

  const cleanMembers = [];
  for (const member of (Array.isArray(members) ? members : [])) {
    const m = String(member || '').trim();
    if (!m || currentMembers.has(m)) continue;
    const user = await findUserByUsername(m);
    if (user && (canInviteAnyUser || friendNames.has(m))) {
      cleanMembers.push(m);
    }
  }

  await withTransaction(async (client) => {
    for (const member of cleanMembers) {
      await client.query(
        'INSERT INTO chat_room_members (room_id, username, role) VALUES ($1, $2, $3) ON CONFLICT (room_id, username) DO NOTHING',
        [roomId, member, 'member']
      );
    }
  });

  return { room: await findRoomById(roomId, username), added: cleanMembers };
}

async function findRoomById(roomId, viewer) {
  const { rows } = await pool.query('SELECT * FROM chat_rooms WHERE id = $1', [roomId]);
  return rows[0] ? mapRoom(rows[0], viewer) : null;
}

async function listRooms(viewer) {
  await ensureDefaultChatRooms();

  if (!viewer) {
    const { rows } = await pool.query(`
      SELECT *
      FROM chat_rooms
      WHERE type = 'public'
      ORDER BY created_at ASC
    `);
    return Promise.all(rows.map((row) => mapRoom(row, viewer)));
  }

  const { rows } = await pool.query(`
    SELECT DISTINCT cr.*
    FROM chat_rooms cr
    LEFT JOIN chat_room_members crm ON crm.room_id = cr.id
    WHERE cr.type = 'public' OR crm.username = $1
    ORDER BY cr.created_at ASC
  `, [viewer]);

  const mapped = await Promise.all(rows.map((row) => mapRoom(row, viewer)));
  return mapped.sort((a, b) => {
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

async function listAdminRooms() {
  await ensureDefaultChatRooms();
  const { rows } = await pool.query(`
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
  `);

  return Promise.all(rows.map(async (row) => {
    const memberRowsResult = await pool.query(`
      SELECT u.username, u.avatar, crm.role
      FROM chat_room_members crm
      LEFT JOIN users u ON u.username = crm.username
      WHERE crm.room_id = $1
      ORDER BY CASE crm.role WHEN 'owner' THEN 0 ELSE 1 END, crm.username ASC
    `, [row.id]);

    const latestResult = await pool.query(`
      SELECT username, message, created_at
      FROM messages WHERE room = $1
      ORDER BY created_at DESC, id DESC LIMIT 1
    `, [row.id]);

    const latest = latestResult.rows[0];
    const members = memberRowsResult.rows.map((member) => ({
      username: member.username,
      avatar: member.avatar || (member.username ? member.username.charAt(0).toUpperCase() : 'U'),
      role: member.role || 'member',
    }));

    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
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
      memberCount: parseInt(row.member_count, 10) || 0,
      messageCount: parseInt(row.message_count, 10) || 0,
      lastMessageAt: row.last_message_at || '',
      members,
    };
  }));
}

async function deleteRoom(roomId) {
  const room = await findRoomById(roomId);
  if (!room) {
    return { deletedCount: 0 };
  }

  const result = await withTransaction(async (client) => {
    await client.query(`
      DELETE FROM message_reactions
      WHERE message_id IN (SELECT id FROM messages WHERE room = $1)
    `, [roomId]);
    await client.query('DELETE FROM messages WHERE room = $1', [roomId]);
    await client.query('DELETE FROM chat_room_members WHERE room_id = $1', [roomId]);
    const { rowCount } = await client.query('DELETE FROM chat_rooms WHERE id = $1', [roomId]);
    return { deletedCount: rowCount };
  });

  if (result.deletedCount > 0) {
    await markRoomDeleted(roomId);
  }
  return result;
}

async function listEvents() {
  const { rows } = await pool.query('SELECT * FROM events ORDER BY created_at DESC, id DESC');
  return rows.map(mapEvent);
}

async function createEvent({ icon = '📅', title, date = '', time = '' }) {
  const { rows } = await pool.query(`
    INSERT INTO events (icon, title, date, time)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [icon || '📅', title, date, time]);
  return mapEvent(rows[0]);
}

async function updateEvent(id, updates = {}) {
  const { rows: currentRows } = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
  const current = currentRows[0];
  if (!current) return null;

  const { rows } = await pool.query(`
    UPDATE events
    SET icon = $1, title = $2, date = $3, time = $4
    WHERE id = $5
    RETURNING *
  `, [
    updates.icon ?? current.icon,
    updates.title ?? current.title,
    updates.date ?? current.date,
    updates.time ?? current.time,
    id,
  ]);
  return mapEvent(rows[0]);
}

async function deleteEvent(id) {
  const { rowCount } = await pool.query('DELETE FROM events WHERE id = $1', [id]);
  return { deletedCount: rowCount };
}

async function listAnnouncements() {
  const { rows } = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC, id DESC');
  return rows.map(mapAnnouncement);
}

async function createAnnouncement({ title, body = '', date = '', createdBy = 'admin', isBroadcast = true }) {
  const { rows } = await pool.query(`
    INSERT INTO announcements (title, body, date, created_by, is_broadcast)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [title, body, date, createdBy, isBroadcast]);
  return mapAnnouncement(rows[0]);
}

async function deleteAnnouncement(id) {
  const { rowCount } = await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  return { deletedCount: rowCount };
}

async function getAdminOverview() {
  const scalar = async (sql) => {
    const { rows } = await pool.query(sql);
    return parseInt(rows[0]?.count, 10) || 0;
  };

  const [
    users, admins, posts, postLikes, postComments, jobs, bookmarks,
    messages, rooms, friendships, pendingFriendships, events, announcements,
    feedback, openFeedback,
  ] = await Promise.all([
    scalar('SELECT COUNT(*) AS count FROM users'),
    scalar('SELECT COUNT(*) AS count FROM admins'),
    scalar('SELECT COUNT(*) AS count FROM posts'),
    scalar('SELECT COUNT(*) AS count FROM post_likes'),
    scalar('SELECT COUNT(*) AS count FROM post_comments'),
    scalar('SELECT COUNT(*) AS count FROM jobs'),
    scalar('SELECT COUNT(*) AS count FROM bookmarks'),
    scalar('SELECT COUNT(*) AS count FROM messages'),
    scalar('SELECT COUNT(*) AS count FROM chat_rooms'),
    scalar("SELECT COUNT(*) AS count FROM friendships WHERE status = 'accepted'"),
    scalar("SELECT COUNT(*) AS count FROM friendships WHERE status = 'pending'"),
    scalar('SELECT COUNT(*) AS count FROM events'),
    scalar('SELECT COUNT(*) AS count FROM announcements'),
    scalar('SELECT COUNT(*) AS count FROM feedback'),
    scalar("SELECT COUNT(*) AS count FROM feedback WHERE status IN ('new', 'reviewing')"),
  ]);

  const totals = {
    users, admins, posts, postLikes, postComments, jobs, bookmarks,
    messages, rooms, friendships, pendingFriendships, events, announcements,
    feedback, openFeedback,
  };

  const [topRoomsResult, recentActivities, recentUsers] = await Promise.all([
    pool.query(`
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
    `),
    listActivities(10),
    listAdminUsers(),
  ]);

  const topRooms = topRoomsResult.rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    messageCount: parseInt(row.message_count, 10) || 0,
    lastMessageAt: row.last_message_at || '',
  }));

  return {
    totals,
    recentActivities,
    recentUsers: recentUsers.slice(0, 6),
    topRooms,
    generatedAt: new Date().toISOString(),
    storage: {
      database: 'PostgreSQL',
      status: 'online',
    },
  };
}

async function getStatistics() {
  const [membersResult, messagesResult, postsResult, jobsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM users'),
    pool.query('SELECT COUNT(*) as count FROM messages'),
    pool.query('SELECT COUNT(*) as count FROM posts'),
    pool.query('SELECT COUNT(*) as count FROM jobs'),
  ]);

  return {
    members: parseInt(membersResult.rows[0].count, 10) || 0,
    messages: parseInt(messagesResult.rows[0].count, 10) || 0,
    posts: parseInt(postsResult.rows[0].count, 10) || 0,
    jobs: parseInt(jobsResult.rows[0].count, 10) || 0,
  };
}

const defaultTheme = {
  brandName: 'Cộng đồng sinh viên NTTU',
  accent: '#2563eb',
  accentStrong: '#0f766e',
  pageBg: '#f3f6fb',
  sidebarBg: 'rgba(15, 23, 42, 0.96)',
  customCss: '',
  loginCoverImage: '',
  loginTitle: '',
  loginDescription: '',
  loginBadges: '',
};

const defaultAiConfig = {
  apiKey: '',
  model: 'mimo-v2.5-pro',
};

function normalizeAiModel(value) {
  const model = String(value || defaultAiConfig.model).trim().slice(0, 100) || defaultAiConfig.model;
  return model.toLowerCase().startsWith('mimo-') ? model.toLowerCase() : model;
}

async function getAppTheme() {
  const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = 'theme'");
  if (!rows[0]) {
    return defaultTheme;
  }

  try {
    const parsed = JSON.parse(rows[0].value || '{}');
    return { ...defaultTheme, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return defaultTheme;
  }
}

async function updateAppTheme(updates = {}) {
  const current = await getAppTheme();
  const next = {
    ...current,
    brandName: String(updates.brandName ?? current.brandName).trim().slice(0, 80) || defaultTheme.brandName,
    accent: String(updates.accent ?? current.accent).trim() || defaultTheme.accent,
    accentStrong: String(updates.accentStrong ?? current.accentStrong).trim() || defaultTheme.accentStrong,
    pageBg: String(updates.pageBg ?? current.pageBg).trim() || defaultTheme.pageBg,
    sidebarBg: String(updates.sidebarBg ?? current.sidebarBg).trim() || defaultTheme.sidebarBg,
    customCss: String(updates.customCss ?? current.customCss).slice(0, 8000),
    loginCoverImage: String(updates.loginCoverImage ?? current.loginCoverImage ?? '').trim().slice(0, 2000),
    loginTitle: String(updates.loginTitle ?? current.loginTitle ?? '').trim().slice(0, 120),
    loginDescription: String(updates.loginDescription ?? current.loginDescription ?? '').trim().slice(0, 500),
    loginBadges: String(updates.loginBadges ?? current.loginBadges ?? '').trim().slice(0, 200),
  };

  await pool.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('theme', $1, NOW())
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [JSON.stringify(next)]);

  return getAppTheme();
}

async function getAiConfig() {
  const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = 'ai_config'");
  if (!rows[0]) return defaultAiConfig;
  try {
    const parsed = JSON.parse(rows[0].value || '{}');
    return { ...defaultAiConfig, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch {
    return defaultAiConfig;
  }
}

async function updateAiConfig(updates = {}) {
  const current = await getAiConfig();
  const next = {
    apiKey: String(updates.apiKey ?? current.apiKey ?? '').trim().slice(0, 500),
    model: normalizeAiModel(updates.model ?? current.model ?? defaultAiConfig.model),
  };

  await pool.query(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('ai_config', $1, NOW())
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `, [JSON.stringify(next)]);

  return getAiConfig();
}

module.exports = {
  pool,
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
  getAiConfig,
  updateAiConfig,
};
