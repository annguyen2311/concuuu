const express = require('express');
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
      req.admin = { ...userPayload, email: currentUser.email, role: currentUser.role };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid admin token' });
    }
  }
};

router.use(checkAdmin);

const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiConfig = await store.getAiConfig();
    if (!aiConfig.apiKey) {
      return res.status(400).json({ error: 'AI API key not configured. Set it in Admin Panel > AI Assistant.' });
    }

    // Build system prompt with server context
    const [stats, theme, users, posts, rooms] = await Promise.all([
      store.getStatistics(),
      store.getAppTheme(),
      store.listAdminUsers(),
      store.listPosts(),
      store.listAdminRooms(),
    ]);

    const systemPrompt = `You are an AI server management assistant for StudentNet (Cộng đồng sinh viên NTTU), a student community platform.

Current server status:
- Total users: ${stats.users}
- Total posts: ${stats.posts}
- Total jobs: ${stats.jobs}
- Active chat rooms: ${rooms.length}
- Brand name: ${theme.brandName}
- Database: PostgreSQL (Railway)

Recent users: ${users.slice(0, 10).map(u => `${u.username} (${u.role})`).join(', ') || 'None'}
Recent posts: ${posts.slice(0, 5).map(p => `"${p.title}" by ${p.author}`).join(', ') || 'None'}
Chat rooms: ${rooms.map(r => r.name || r.id).join(', ') || 'None'}

You can help with:
- Monitoring server health and statistics
- Analyzing user activity and engagement
- Reviewing content (posts, feedback)
- Suggesting improvements
- Answering questions about the platform

Respond concisely in the same language the user writes in (Vietnamese or English). Be helpful and direct.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-20), // Keep last 20 messages for context
      { role: 'user', content: message },
    ];

    const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.model || 'MiMo-V2.5-Pro',
        messages,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiMo API error:', response.status, errorText);
      return res.status(502).json({ error: `AI API error: ${response.status}` });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'No response from AI.';

    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = await store.getAiConfig();
    // Mask the API key for security
    res.json({
      apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}` : '',
      apiKeySet: Boolean(config.apiKey),
      model: config.model,
    });
  } catch (err) {
    console.error('AI config error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const updated = await store.updateAiConfig(req.body);
    res.json({
      apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 8)}...${updated.apiKey.slice(-4)}` : '',
      apiKeySet: Boolean(updated.apiKey),
      model: updated.model,
    });
  } catch (err) {
    console.error('AI config update error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
