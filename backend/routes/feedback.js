const express = require('express');
const store = require('../db/store');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

router.use(requireUser);

router.get('/mine', async (req, res) => {
  try {
    res.json(await store.listFeedback({ username: req.user.username }));
  } catch (e) {
    console.error('❌ Error fetching feedback:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { type, title, message, rating } = req.body || {};
    const feedback = await store.createFeedback({
      username: req.user.username,
      type,
      title,
      message,
      rating,
    });

    if (!feedback) {
      return res.status(400).json({ error: 'Title and message required' });
    }

    await store.addUserReputation(req.user.username, 10);

    await store.createActivity({
      username: req.user.username,
      action: 'đã gửi feedback',
      target: feedback.title,
      icon: '🛠️',
    });

    res.json(feedback);
  } catch (e) {
    console.error('❌ Error creating feedback:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
