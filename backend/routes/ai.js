const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const store = require('../db/store');

const router = express.Router();
const ADMIN_JWT_SECRET = config.adminJwtSecret;
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';
const scopedRefusalByLanguage = {
  vi: 'Mình chỉ hỗ trợ hỏi đáp kiến thức học tập và thông tin server. Mình không viết, sửa, debug hoặc tạo code. Bạn có thể hỏi mình giải thích khái niệm ở mức học tập.',
  en: 'I only support study questions and server information. I do not write, fix, debug, or generate code. You can ask for a high-level concept explanation instead.',
};

function cleanEnv(value) {
  const text = String(value || '').trim();
  if (!text || text === '""' || text === "''") return '';
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).trim();
  }
  return text;
}

function normalizeMimoModel(value) {
  const model = cleanEnv(value) || DEFAULT_MIMO_MODEL;
  return model.toLowerCase().startsWith('mimo-') ? model.toLowerCase() : model;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getMessageLanguage(message) {
  return /[ăâđêôơưáàạảãắằặẳẵấầậẩẫéèẹẻẽếềệểễíìịỉĩóòọỏõốồộổỗớờợởỡúùụủũứừựửữýỳỵỷỹ]/i.test(message)
    ? 'vi'
    : 'en';
}

function isCodeWritingRequest(message) {
  const text = normalizeText(message);
  const codeTerms = '(code|ma nguon|source code|script|chuong trinh|program|function|ham|class|component|api|endpoint|sql|query|html|css|javascript|typescript|python|node|react|vue|shell|bash|powershell|docker|config|patch)';
  const actionTerms = '(viet|tao|lam|xay dung|lap trinh|sua|fix|debug|review|refactor|toi uu|optimize|hoan thien|generate|write|create|build|implement|complete|convert)';

  return [
    /\b(vi.t|viet|write|generate|create|tao|lam|sua|fix|debug|review).{0,30}code\b/i,
    /\bcode\s+(react|python|javascript|typescript|node|html|css|api|web|app|login|component|function|ham)\b/i,
    new RegExp(`${actionTerms}.{0,80}${codeTerms}`, 'i'),
    new RegExp(`${codeTerms}.{0,80}${actionTerms}`, 'i'),
    /\b(full code|complete code|boilerplate|code mau|mau code|doan code)\b/i,
    /\b(debug|fix bug|sua loi|review code|refactor|pull request|unit test)\b/i,
    /```/,
  ].some((pattern) => pattern.test(text));
}

function getScopedRefusal(message) {
  return scopedRefusalByLanguage[getMessageLanguage(message)];
}

const checkUser = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
    req.admin._isAdmin = req.admin.role === 'admin';
    return next();
  } catch {
    try {
      const userPayload = jwt.verify(token, config.jwtSecret);
      const currentUser = await store.findUserByUsername(userPayload.username);
      if (!currentUser) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.admin = { ...userPayload, email: currentUser.email, role: currentUser.role, _isAdmin: currentUser.role === 'admin' };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
};

const checkAdmin = (req, res, next) => {
  if (!req.admin?._isAdmin) {
    return res.status(403).json({ error: 'Admin role required' });
  }
  return next();
};

router.use(checkUser);

const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';

router.post('/chat', checkAdmin, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (isCodeWritingRequest(message)) {
      return res.json({ reply: getScopedRefusal(message) });
    }

    const aiConfig = await store.getAiConfig();
    const apiKey = cleanEnv(aiConfig.apiKey) || cleanEnv(process.env.MIMO_API_KEY) || cleanEnv(process.env.XIAOMIMIMO_API_KEY);
    const model = normalizeMimoModel(aiConfig.model || process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL);

    if (!apiKey) {
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

    const systemPrompt = `You are a restricted AI assistant for StudentNet (Cong dong sinh vien NTTU), a student community platform.

Allowed scope:
- Study and learning support: explain concepts, summarize lessons, suggest study plans, answer academic questions.
- Server and platform information: explain the current StudentNet server status, statistics, content, users, chat rooms, and operational context below.

Strict limits:
- Do not write, generate, complete, debug, refactor, review, or optimize code.
- Do not output code blocks, shell commands, SQL queries, config files, patches, or full implementation steps.
- If the user asks for code or software implementation, refuse briefly in the same language and redirect them to ask for a high-level concept explanation instead.
- If the request is outside study support or server/platform information, refuse briefly and restate the allowed scope.

Current server status:
- Total users: ${stats.members}
- Total posts: ${stats.posts}
- Total jobs: ${stats.jobs}
- Active chat rooms: ${rooms.length}
- Brand name: ${theme.brandName}
- Database: PostgreSQL (Railway)

Recent users: ${users.slice(0, 10).map(u => `${u.username} (${u.role})`).join(', ') || 'None'}
Recent posts: ${posts.slice(0, 5).map(p => `"${p.title}" by ${p.author}`).join(', ') || 'None'}
Chat rooms: ${rooms.map(r => r.name || r.id).join(', ') || 'None'}

You can help with:
- Study explanations and learning guidance
- Monitoring server health and statistics
- Analyzing user activity and engagement
- Reviewing platform content at a high level
- Answering questions about the platform

Respond concisely in the same language the user writes in (Vietnamese or English). Be helpful and direct.`;

    const allowedRoles = new Set(['user', 'assistant']);
    const sanitizedHistory = conversationHistory
      .filter((m) => m && allowedRoles.has(m.role) && typeof m.content === 'string')
      .slice(-20);

    const messages = [
      { role: 'system', content: systemPrompt },
      ...sanitizedHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/config', checkAdmin, async (req, res) => {
  try {
    const aiCfg = await store.getAiConfig();
    const envApiKey = cleanEnv(process.env.MIMO_API_KEY) || cleanEnv(process.env.XIAOMIMIMO_API_KEY);
    res.json({
      apiKey: aiCfg.apiKey ? `${aiCfg.apiKey.slice(0, 8)}...${aiCfg.apiKey.slice(-4)}` : '',
      apiKeySet: Boolean(aiCfg.apiKey || envApiKey),
      model: normalizeMimoModel(aiCfg.model || process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL),
    });
  } catch (err) {
    console.error('AI config error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', checkAdmin, async (req, res) => {
  try {
    const updated = await store.updateAiConfig(req.body);
    const envApiKey = cleanEnv(process.env.MIMO_API_KEY) || cleanEnv(process.env.XIAOMIMIMO_API_KEY);
    res.json({
      apiKey: updated.apiKey ? `${updated.apiKey.slice(0, 8)}...${updated.apiKey.slice(-4)}` : '',
      apiKeySet: Boolean(updated.apiKey || envApiKey),
      model: normalizeMimoModel(updated.model || process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL),
    });
  } catch (err) {
    console.error('AI config update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
