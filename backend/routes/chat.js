const express = require('express');
const store = require('../db/store');
const { requireSameUser, requireUser } = require('../middleware/auth');
const router = express.Router();

router.put('/messages/:id/reaction', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username, reaction } = req.body || {};
        const messageId = parseInt(req.params.id, 10);

        if (!Number.isFinite(messageId)) {
            return res.status(400).json({ error: 'Valid message id required' });
        }
        if (!username || !reaction) {
            return res.status(400).json({ error: 'Username and reaction required' });
        }

        const canReact = await store.canReactToMessage(messageId, username);
        if (!canReact) {
            return res.status(403).json({ error: 'You do not have access to this message' });
        }

        const updatedMessage = await store.toggleMessageReaction(messageId, { username, reaction });
        if (!updatedMessage) {
            return res.status(404).json({ error: 'Message not found' });
        }

        res.json(updatedMessage);
    } catch (e) {
        console.error('❌ Error reacting to message:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rooms/private', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username, friendUsername } = req.body || {};
        if (!username || !friendUsername) {
            return res.status(400).json({ error: 'username and friendUsername required' });
        }

        const room = await store.ensurePrivateRoom(username, friendUsername);
        if (!room) {
            return res.status(404).json({ error: 'Unable to create private room' });
        }

        res.json(room);
    } catch (e) {
        console.error('❌ Error creating private room:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/rooms/groups', requireUser, requireSameUser((req) => req.body.createdBy), async (req, res) => {
    try {
        const { name, members, createdBy, icon } = req.body || {};
        if (!name || !createdBy) {
            return res.status(400).json({ error: 'name and createdBy required' });
        }

        const room = await store.createGroupRoom({ name, members, createdBy, icon });
        if (!room) {
            return res.status(400).json({ error: 'Unable to create group room' });
        }

        res.json(room);
    } catch (e) {
        console.error('❌ Error creating group room:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/rooms/:roomId/members', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username, members } = req.body || {};
        if (!username) {
            return res.status(400).json({ error: 'username required' });
        }

        const result = await store.addGroupRoomMembers({
            roomId: req.params.roomId,
            username,
            members,
        });

        if (result.notFound) {
            return res.status(404).json({ error: 'Group room not found' });
        }
        if (result.forbidden) {
            return res.status(403).json({ error: 'Only group owners can add members' });
        }

        res.json({ room: result.room, added: result.added || [] });
    } catch (e) {
        console.error('❌ Error adding group members:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/rooms/list/all', requireUser, async (req, res) => {
    try {
        res.json(await store.listRooms(req.user.username));
    } catch (e) {
        console.error('❌ Error fetching rooms:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:room', requireUser, async (req, res) => {
    try {
        const canAccess = await store.canAccessRoom(req.params.room, req.user.username);
        if (!canAccess) {
            return res.status(403).json({ error: 'You do not have access to this room' });
        }

        const limit = Number.parseInt(req.query.limit, 10);
        const beforeId = Number.parseInt(req.query.beforeId, 10);
        const beforeCreatedAt = req.query.beforeCreatedAt;

        const messages = await store.listMessagesByRoom(req.params.room, {
            limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50,
            before: Number.isFinite(beforeId) && beforeCreatedAt ? { id: beforeId, createdAt: beforeCreatedAt } : undefined,
        });
        res.json(messages);
    } catch (e) {
        console.error('❌ Error fetching messages:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:room', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username, message } = req.body;
        if (!username || !message) {
            return res.status(400).json({ error: 'Username and message required' });
        }
        const canSend = await store.canSendMessageToRoom(req.params.room, username);
        if (!canSend) {
            return res.status(403).json({ error: 'You cannot send messages to this room' });
        }

        const msg = await store.createMessage({ room: req.params.room, username, message });
        res.json(msg);
    } catch (e) {
        console.error('❌ Error creating message:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
