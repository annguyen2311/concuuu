const express = require('express');
const http = require('http');
const cors = require('cors');
const socketio = require('socket.io');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const store = require('./db/store');
const { runMigrations } = require('./db/index');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const postsRoutes = require('./routes/posts');
const jobsRoutes = require('./routes/jobs');
const bookmarksRoutes = require('./routes/bookmarks');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: config.corsOrigin },
  transports: ['websocket', 'polling']
});
app.set('io', io);

const initializeDefaultAdmin = async () => {
  const existingAdmin = await store.findAdminByUsername(config.defaultAdmin.username);
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(config.defaultAdmin.password, 10);
    await store.createAdmin({
      username: config.defaultAdmin.username,
      email: config.defaultAdmin.email,
      password: hashedPassword,
      role: 'admin'
    });
    console.log(`✅ Default admin account created: ${config.defaultAdmin.username}`);
  }
};

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '8mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const stats = await store.getStatistics();
    res.json({
      status: 'ok',
      service: 'studentnet',
      database: 'postgresql',
      uptime: process.uptime(),
      generatedAt: new Date().toISOString(),
      stats,
    });
  } catch (error) {
    console.error('Health check error:', error.message);
    res.status(500).json({
      status: 'error',
      service: 'studentnet',
    });
  }
});

app.use(express.static(path.join(__dirname, '../frontend/dist')));

const emitRoomUserCount = (room) => {
  const count = io.sockets.adapter.rooms.get(room)?.size || 0;
  io.to(room).emit('userCount', count);
};

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token
    || String(socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    return next(new Error('User token required'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const currentUser = await store.findUserByUsername(payload.username);
    if (!currentUser) {
      return next(new Error('User not found'));
    }

    socket.user = {
      id: currentUser._id,
      username: currentUser.username,
      email: currentUser.email,
      role: currentUser.role,
    };
    return next();
  } catch {
    return next(new Error('Invalid user token'));
  }
});

io.on('connection', socket => {
  console.log('✅ User connected:', socket.user?.username || socket.id);

  socket.on('joinRoom', async (room) => {
    if (!room) {
      return;
    }
    const canAccess = await store.canAccessRoom(room, socket.user.username);
    if (!canAccess) {
      socket.emit('chatError', { room, error: 'You do not have access to this room' });
      return;
    }
    socket.join(room);
    console.log(`📍 User ${socket.user.username} joined room: ${room}`);
    emitRoomUserCount(room);
  });

  socket.on('leaveRoom', room => {
    if (!room) {
      return;
    }
    socket.leave(room);
    emitRoomUserCount(room);
  });

  socket.on('typing', async ({ room }) => {
    if (!room) return;
    const canAccess = await store.canAccessRoom(room, socket.user.username);
    if (!canAccess) return;
    socket.to(room).emit('typing', { room, username: socket.user.username });
  });

  socket.on('stopTyping', ({ room }) => {
    if (!room) {
      return;
    }
    socket.to(room).emit('stopTyping', { room, username: socket.user.username });
  });

  socket.on('sendMessage', async ({ room, message }) => {
    try {
      const text = String(message || '').trim();
      if (!room || !text) {
        return;
      }
      const canSend = await store.canSendMessageToRoom(room, socket.user.username);
      if (!canSend) {
        socket.emit('chatError', { room, error: 'You cannot send messages to this room' });
        return;
      }

      const savedMessage = await store.createMessage({ room, username: socket.user.username, message: text });
      io.to(room).emit('newMessage', savedMessage);
      io.to(room).emit('stopTyping', { room, username: socket.user.username });
    } catch (error) {
      console.error('❌ Socket message error:', error.message);
    }
  });

  socket.on('toggleReaction', async ({ messageId, reaction }) => {
    try {
      if (!messageId || !reaction) {
        return;
      }
      const canReact = await store.canReactToMessage(parseInt(messageId, 10), socket.user.username);
      if (!canReact) {
        socket.emit('chatError', { error: 'You cannot react to this message' });
        return;
      }

      const updatedMessage = await store.toggleMessageReaction(parseInt(messageId, 10), {
        username: socket.user.username,
        reaction,
      });
      if (updatedMessage) {
        io.to(updatedMessage.room).emit('messageReactionUpdated', updatedMessage);
      }
    } catch (error) {
      console.error('❌ Socket reaction error:', error.message);
    }
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        socket.to(room).emit('stopTyping', { room });
        setTimeout(() => emitRoomUserCount(room), 0);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.user?.username || socket.id);
  });
});

app.all('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

async function main() {
  console.log('💾 Initializing PostgreSQL database...');
  await runMigrations();
  await initializeDefaultAdmin();
  await store.promotePrimaryAdminUser();

  server.listen(config.port, () => {
    console.log(`🚀 Cộng đồng sinh viên NTTU API running on http://localhost:${config.port}`);
    console.log('📊 Build frontend with npm run build to serve it from the backend.');
    console.log('🐘 Using PostgreSQL database');
  });
}

main().catch((error) => {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
});
