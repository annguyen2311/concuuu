const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db/store');
const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password required' });
        }

        if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(username)) {
            return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, underscores, dots, hyphens)' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const [existingByUsername, existingByEmail] = await Promise.all([
            store.findUserByUsername(username),
            store.findUserByEmail(email),
        ]);
        const existingUser = existingByUsername || existingByEmail;
        if (existingUser) {
            return res.status(400).json({ error: existingUser.username === username ? 'Username already exists' : 'Email already exists' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await store.createUser({ username, email, password: hashed });
        res.status(201).json({
            msg: 'OK',
            user: {
                username: user.username,
                email: user.email,
                role: user.role,
                reputation: user.reputation,
                level: user.level,
                levelNumber: user.levelNumber,
                isOwner: user.isOwner
            }
        });
    } catch (e) {
        console.error('❌ Registration error:', e.message);
        res.status(400).json({ error: 'Registration failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await store.findUserByLogin(username);
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, email: user.email, role: user.role },
            config.jwtSecret,
            { expiresIn: config.jwtExpiresIn }
        );
        res.json({
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role,
                reputation: user.reputation,
                level: user.level,
                levelNumber: user.levelNumber,
                isOwner: user.isOwner,
                bio: user.bio,
                school: user.school,
                major: user.major,
                avatar: user.avatar,
                coverImage: user.coverImage
            }
        });
    } catch (e) {
        console.error('❌ Login error:', e.message);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.get('/top-users', async (req, res) => {
    try {
        const users = await store.listTopUsers(5);
        res.json(users.map(user => ({
            username: user.username,
            reputation: user.reputation,
            level: user.level,
            levelNumber: user.levelNumber,
            avatar: user.avatar,
            isOwner: user.isOwner
        })));
    } catch (e) {
        console.error('❌ Top users error:', e.message);
        res.status(500).json({ error: 'Failed to load top users' });
    }
});

router.get('/statistics', async (req, res) => {
    try {
        const stats = await store.getStatistics();
        res.json(stats);
    } catch (e) {
        console.error('❌ Statistics error:', e.message);
        res.json({ members: 0, messages: 0, posts: 0, jobs: 0 });
    }
});

router.get('/activities', async (req, res) => {
    try {
        const activities = await store.listActivities();
        res.json(activities);
    } catch (e) {
        console.error('❌ Activities error:', e.message);
        res.status(500).json({ error: 'Failed to load activities' });
    }
});

router.get('/events', async (req, res) => {
    try {
        res.json(await store.listEvents());
    } catch (e) {
        console.error('❌ Events error:', e.message);
        res.status(500).json({ error: 'Failed to load events' });
    }
});

router.get('/announcements', async (req, res) => {
    try {
        res.json(await store.listAnnouncements());
    } catch (e) {
        console.error('❌ Announcements error:', e.message);
        res.status(500).json({ error: 'Failed to load announcements' });
    }
});

router.get('/theme', async (req, res) => {
    try {
        res.json(await store.getAppTheme());
    } catch (e) {
        console.error('❌ Theme error:', e.message);
        res.status(500).json({ error: 'Failed to load theme' });
    }
});

module.exports = router;
