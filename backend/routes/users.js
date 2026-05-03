const express = require('express');
const bcrypt = require('bcryptjs');
const store = require('../db/store');
const { optionalUser, requireSameUser, requireUser } = require('../middleware/auth');
const router = express.Router();

const safeUser = (user) => {
    if (!user) return null;
    const { password, ...rest } = user;
    return rest;
};

router.get('/', optionalUser, async (req, res) => {
    try {
        res.json(await store.listDiscoverableUsers(req.query.viewer || req.user?.username));
    } catch (e) {
        console.error('❌ Error fetching users:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username', optionalUser, async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const viewer = req.query.viewer || req.user?.username;
        const publicProfile = await store.getPublicUserProfile(req.params.username, viewer);
        if (publicProfile?.privateProfile) {
            return res.json(publicProfile);
        }

        const [userPosts, allUserPosts, tags] = await Promise.all([
            store.listPostsByAuthor(req.params.username, 5),
            store.listPostsByAuthor(req.params.username),
            store.listUserTags(req.params.username),
        ]);
        res.json({
            ...safeUser(user),
            postCount: allUserPosts.length,
            posts: userPosts,
            tags,
        });
    } catch (e) {
        console.error('❌ Error fetching profile:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username/friends', async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.listFriends(req.params.username));
    } catch (e) {
        console.error('❌ Error fetching friends:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username/friend-requests', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.listFriendRequests(req.params.username));
    } catch (e) {
        console.error('❌ Error fetching friend requests:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.post('/:username/friend-requests', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const { friendUsername } = req.body || {};
        const result = await store.sendFriendRequest(req.params.username, friendUsername);
        if (!result) {
            return res.status(400).json({ error: 'Unable to send friend request' });
        }
        res.json(result);
    } catch (e) {
        console.error('❌ Error sending friend request:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:username/friend-requests/:requester/accept', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const result = await store.acceptFriendRequest(req.params.username, req.params.requester);
        if (!result) {
            return res.status(404).json({ error: 'Friend request not found' });
        }
        res.json(result);
    } catch (e) {
        console.error('❌ Error accepting friend request:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/:username/friends/:friendUsername', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        res.json(await store.removeFriendship(req.params.username, req.params.friendUsername));
    } catch (e) {
        console.error('❌ Error removing friendship:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username/settings', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.getUserSettings(req.params.username));
    } catch (e) {
        console.error('❌ Error fetching settings:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:username/settings', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.updateUserSettings(req.params.username, req.body || {}));
    } catch (e) {
        console.error('❌ Error updating settings:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:username/tags', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.replaceUserTags(req.params.username, req.body.tags));
    } catch (e) {
        console.error('❌ Error updating tags:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username/tags', async (req, res) => {
    try {
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(await store.listUserTags(req.params.username));
    } catch (e) {
        console.error('❌ Error fetching tags:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:username/password', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        const user = await store.findUserByUsername(req.params.username);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await store.updateUserPassword(req.params.username, hashed);
        res.json({ msg: 'Password updated successfully' });
    } catch (e) {
        console.error('❌ Error updating password:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.put('/:username', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const { bio, school, major, avatar, coverImage } = req.body;
        const user = await store.updateUserProfile(req.params.username, { bio, school, major, avatar, coverImage });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (e) {
        console.error('❌ Error updating profile:', e.message);
        res.status(500).json({ error: e.message });
    }
});

router.get('/:username/posts', async (req, res) => {
    try {
        const posts = await store.listPostsByAuthor(req.params.username);
        res.json(posts);
    } catch (e) {
        console.error('❌ Error fetching user posts:', e.message);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
