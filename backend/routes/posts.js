const express = require('express');
const store = require('../db/store');
const { requireSameUser, requireUser } = require('../middleware/auth');
const router = express.Router();

const toId = (value) => {
    const id = Number.parseInt(value, 10);
    return Number.isFinite(id) && id >= 1 ? id : null;
};

router.get('/', async (req, res) => {
    try {
        res.json(await store.listPosts());
    } catch (e) {
        console.error('❌ Error fetching posts:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const postId = toId(req.params.id);
        if (!postId) {
            return res.status(400).json({ error: 'Valid post id required' });
        }

        const post = await store.findPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (e) {
        console.error('❌ Error fetching post:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/', requireUser, requireSameUser((req) => req.body.author), async (req, res) => {
    try {
        const { author, title, content } = req.body;
        if (!author || !title || !content) {
            return res.status(400).json({ error: 'Author, title, and content required' });
        }
        const post = await store.createPost({ author, title, content });
        await store.addUserReputation(author, 25);

        await store.createActivity({
            username: author,
            action: 'đã đăng',
            target: title,
            icon: '📝'
        });

        res.json(post);
    } catch (e) {
        console.error('❌ Error creating post:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/:id/like', requireUser, requireSameUser((req) => req.body.username), async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username required' });
        }

        const postId = toId(req.params.id);
        if (!postId) {
            return res.status(400).json({ error: 'Valid post id required' });
        }

        const post = await store.findPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const updatedPost = await store.togglePostLike(postId, username);
        res.json(updatedPost);
    } catch (e) {
        console.error('❌ Error liking post:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:id/comment', requireUser, requireSameUser((req) => req.body.user), async (req, res) => {
    try {
        const { user, text } = req.body;
        if (!user || !String(text || '').trim()) {
            return res.status(400).json({ error: 'User and comment text required' });
        }

        const postId = toId(req.params.id);
        if (!postId) {
            return res.status(400).json({ error: 'Valid post id required' });
        }

        const post = await store.findPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const comment = await store.addPostComment(postId, { user, text: String(text).trim() });
        await store.addUserReputation(user, 8);
        res.json(comment);
    } catch (e) {
        console.error('❌ Error commenting:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.delete('/:id', requireUser, async (req, res) => {
    try {
        const postId = toId(req.params.id);
        if (!postId) {
            return res.status(400).json({ error: 'Valid post id required' });
        }

        const post = await store.findPostById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        if (post.author !== req.user.username) {
            return res.status(403).json({ error: 'Only the post author can delete this post' });
        }
        await store.deletePost(postId);
        res.json({ message: 'Post deleted successfully' });
    } catch (e) {
        console.error('❌ Error deleting post:', e.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
