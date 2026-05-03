const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db/store');

const router = express.Router();
const ADMIN_JWT_SECRET = config.adminJwtSecret;

const checkAdmin = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Admin token required' });
  }

  try {
    req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
    return next();
  } catch {
    try {
      const userPayload = jwt.verify(token, config.jwtSecret);
      const currentUser = await store.findUserByUsername(userPayload.username);
      if (!currentUser || currentUser.role !== 'admin') {
        return res.status(403).json({ error: 'Admin role required' });
      }
      req.admin = {
        ...userPayload,
        email: currentUser.email,
        role: currentUser.role,
      };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  }
};

const toId = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id >= 1 ? id : null;
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await store.findAdminByLogin(username);
    if (!admin) {
      const user = await store.findUserByLogin(username);
      if (!user || user.role !== 'admin') {
        return res.status(400).json({ error: 'Admin not found' });
      }

      const userPasswordValid = await bcrypt.compare(password, user.password);
      if (!userPasswordValid) {
        return res.status(400).json({ error: 'Invalid password' });
      }

      const userToken = jwt.sign(
        { id: user._id, username: user.username, email: user.email, role: user.role },
        ADMIN_JWT_SECRET,
        { expiresIn: config.adminJwtExpiresIn }
      );
      return res.json({
        token: userToken,
        admin: {
          username: user.username,
          email: user.email,
          role: user.role,
          isOwner: user.isOwner,
        },
      });
    }

    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    const token = jwt.sign(
      { username: admin.username, email: admin.email, role: admin.role },
      ADMIN_JWT_SECRET,
      { expiresIn: config.adminJwtExpiresIn }
    );
    res.json({
      token,
      admin: {
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isOwner: store.isPrimaryAdminEmail(admin.email),
      },
    });
  } catch (err) {
    console.error('Admin login error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.use(checkAdmin);

router.get('/overview', async (req, res) => {
  try {
    res.json(await store.getAdminOverview());
  } catch (err) {
    console.error('Admin overview error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/theme', async (req, res) => {
  try {
    res.json(await store.getAppTheme());
  } catch (err) {
    console.error('Admin theme error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/theme', async (req, res) => {
  try {
    res.json(await store.updateAppTheme(req.body || {}));
  } catch (err) {
    console.error('Admin update theme error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const overview = await store.getAdminOverview();
    const activities = await store.listActivities();
    res.json({
      totalUsers: overview.totals.users,
      totalPosts: overview.totals.posts,
      totalJobs: overview.totals.jobs,
      totalActivities: activities.length,
      totals: overview.totals,
      recentActivities: overview.recentActivities,
      topRooms: overview.topRooms,
      generatedAt: overview.generatedAt,
    });
  } catch (err) {
    console.error('Admin stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/feedback', async (req, res) => {
  try {
    res.json(await store.listFeedback());
  } catch (err) {
    console.error('Admin feedback error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/feedback/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid feedback id required' });
    }

    const feedback = await store.updateFeedbackStatus(id, req.body?.status);
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found or invalid status' });
    }

    res.json(feedback);
  } catch (err) {
    console.error('Admin update feedback error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/feedback/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid feedback id required' });
    }

    const result = await store.deleteFeedback(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete feedback error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    res.json(await store.listAdminUsers());
  } catch (err) {
    console.error('Admin users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:username', async (req, res) => {
  try {
    const user = await store.updateUserByAdmin(req.params.username, req.body || {}, req.admin);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Admin update user error:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.delete('/users/:username', async (req, res) => {
  try {
    const result = await store.deleteUser(req.params.username, {
      cascadeContent: req.query.cascadeContent === 'true',
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete user error:', err.message);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const admins = await store.listAdmins();
    res.json(admins.map(({ password, ...admin }) => admin));
  } catch (err) {
    console.error('Admin list admins error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/create-admin', async (req, res) => {
  try {
    const { username, email, password, role } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingAdmin = await store.findAdminByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await store.createAdmin({
      username,
      email,
      password: hashedPassword,
      role: role || 'admin',
    });
    const { password: _password, ...safeAdmin } = admin;
    res.json({ message: 'Admin created successfully', admin: safeAdmin });
  } catch (err) {
    console.error('Admin create admin error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/posts', async (req, res) => {
  try {
    res.json(await store.listPosts());
  } catch (err) {
    console.error('Admin posts error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid post id required' });
    }
    const result = await store.deletePost(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete post error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    res.json(await store.listJobs());
  } catch (err) {
    console.error('Admin jobs error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/jobs/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid job id required' });
    }
    const result = await store.deleteJob(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete job error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    res.json(await store.listAdminRooms());
  } catch (err) {
    console.error('Admin rooms error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const { name, icon, category, topic, position, isLocked } = req.body || {};
    if (!String(name || '').trim()) {
      return res.status(400).json({ error: 'Room name required' });
    }

    const room = await store.createPublicRoom({
      name,
      icon,
      category,
      topic,
      position,
      isLocked,
      createdBy: req.admin?.username || 'admin',
    });

    if (!room) {
      return res.status(400).json({ error: 'Unable to create room' });
    }
    res.json(room);
  } catch (err) {
    console.error('Admin create room error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const room = await store.findRoomById(req.params.roomId, req.admin?.username);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      room,
      messages: await store.listMessagesByRoom(req.params.roomId, {
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 150,
      }),
    });
  } catch (err) {
    console.error('Admin room messages error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/rooms/:roomId', async (req, res) => {
  try {
    const result = await store.deleteRoom(req.params.roomId);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json({ message: 'Room deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete room error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/announcements', async (req, res) => {
  try {
    res.json(await store.listAnnouncements());
  } catch (err) {
    console.error('Admin announcements error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/announcements', async (req, res) => {
  try {
    const { title, body, createdBy } = req.body || {};
    if (!String(title || '').trim()) {
      return res.status(400).json({ error: 'Title required' });
    }

    const announcement = await store.createAnnouncement({
      title: String(title).trim(),
      body: String(body || '').trim(),
      date: 'Vừa xong',
      createdBy: createdBy || 'admin',
      isBroadcast: true,
    });

    res.json(announcement);
  } catch (err) {
    console.error('Admin create announcement error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid announcement id required' });
    }
    const result = await store.deleteAnnouncement(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Announcement deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete announcement error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/events', async (req, res) => {
  try {
    res.json(await store.listEvents());
  } catch (err) {
    console.error('Admin events error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { icon, title, date, time } = req.body || {};
    if (!String(title || '').trim()) {
      return res.status(400).json({ error: 'Title required' });
    }
    res.json(await store.createEvent({
      icon: icon || '📅',
      title: String(title).trim(),
      date: String(date || '').trim(),
      time: String(time || '').trim(),
    }));
  } catch (err) {
    console.error('Admin create event error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put('/events/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid event id required' });
    }
    const event = await store.updateEvent(id, req.body || {});
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    console.error('Admin update event error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/events/:id', async (req, res) => {
  try {
    const id = toId(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'Valid event id required' });
    }
    const result = await store.deleteEvent(id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully', ...result });
  } catch (err) {
    console.error('Admin delete event error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
