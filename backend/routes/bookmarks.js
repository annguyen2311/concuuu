const express = require('express');
const store = require('../db/store');
const { requireSameUser, requireUser } = require('../middleware/auth');
const router = express.Router();

router.get('/user/:username', requireUser, requireSameUser((req) => req.params.username), async (req, res) => {
    try {
        const [bookmarks, posts, jobs] = await Promise.all([
            store.listBookmarksByUser(req.params.username),
            store.listPosts(),
            store.listJobs(),
        ]);

        const bookmarkedItems = bookmarks.map((bookmark) => {
            if (bookmark.type === 'post') {
                const post = posts.find(item => item._id === bookmark.postId);
                return post ? { ...post, bookmarkType: bookmark.type, bookmarkId: bookmark._id } : null;
            }
            if (bookmark.type === 'job') {
                const job = jobs.find(item => item._id === bookmark.postId);
                return job ? { ...job, bookmarkType: bookmark.type, bookmarkId: bookmark._id } : null;
            }
            return null;
        }).filter(Boolean);

        res.json(bookmarkedItems);
    } catch (e) {
        console.error('❌ Error fetching bookmarks:', e.message);
        res.status(500).json({ error: 'Failed to load bookmarks' });
    }
});

router.post('/', requireUser, requireSameUser((req) => req.body.userId), async (req, res) => {
    try {
        const { userId, postId, type } = req.body;
        if (!userId || !postId || !type) {
            return res.status(400).json({ error: 'userId, postId, type required' });
        }

        const bookmark = await store.createBookmark({ userId, postId, type });
        if (!bookmark) {
            return res.status(400).json({ error: 'Already bookmarked' });
        }
        res.json(bookmark);
    } catch (e) {
        console.error('❌ Error creating bookmark:', e.message);
        res.status(500).json({ error: 'Failed to create bookmark' });
    }
});

router.delete('/', requireUser, requireSameUser((req) => req.query.userId), async (req, res) => {
    try {
        const { userId, postId, type } = req.query;
        if (!userId || !postId) {
            return res.status(400).json({ error: 'userId and postId required' });
        }

        const result = await store.deleteBookmark({ userId, postId: Number(postId), type });
        res.json(result);
    } catch (e) {
        console.error('❌ Error deleting bookmark:', e.message);
        res.status(500).json({ error: 'Failed to delete bookmark' });
    }
});

module.exports = router;
