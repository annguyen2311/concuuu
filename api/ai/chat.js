const crypto = require('crypto');

const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';

const scopedAssistantPrompt = `You are a restricted AI assistant for Cong dong sinh vien NTTU.

Allowed scope:
- Study and learning support: explain concepts, summarize lessons, suggest study plans, answer academic questions.
- Server and platform information: explain the current StudentNet server status, statistics, content, users, chat rooms, and operational context when provided.

Strict limits:
- Do not write, generate, complete, debug, refactor, review, or optimize code.
- Do not output code blocks, shell commands, SQL queries, config files, patches, or full implementation steps.
- If the user asks for code or software implementation, refuse briefly in the same language and redirect them to ask for a high-level concept explanation instead.
- If the request is outside study support or server/platform information, refuse briefly and restate the allowed scope.

Respond concisely in the same language the user writes in, especially Vietnamese when the user writes Vietnamese.`;

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

async function readJsonBody(req) {
  if (req.body && typeof req.body !== 'string') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function base64UrlDecode(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyJwt(token, secret) {
  const jwtSecret = cleanEnv(secret);
  if (!token || !jwtSecret) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader));
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  if (header.alg !== 'HS256') return null;
  if (payload.exp && Date.now() >= payload.exp * 1000) return null;

  const expectedSignature = crypto
    .createHmac('sha256', jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return safeEqual(signature, expectedSignature) ? payload : null;
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function isAdminRequest(req) {
  const token = getBearerToken(req);
  if (!token) return false;

  const adminPayload = verifyJwt(token, process.env.ADMIN_JWT_SECRET);
  if (adminPayload?.role === 'admin') return true;

  const userPayload = verifyJwt(token, process.env.JWT_SECRET);
  if (userPayload?.role === 'admin') return true;

  const backendUrl = cleanEnv(process.env.VITE_API_URL) || cleanEnv(process.env.BACKEND_API_URL);
  if (!backendUrl) return false;

  try {
    const response = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch (err) {
    console.error('Backend admin verification failed:', err);
    return false;
  }
}

async function getServerContext(req) {
  const backendUrl = cleanEnv(process.env.VITE_API_URL) || cleanEnv(process.env.BACKEND_API_URL);
  if (!backendUrl) return '';

  const baseUrl = backendUrl.replace(/\/+$/, '');
  const token = getBearerToken(req);

  try {
    const overviewResponse = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (overviewResponse.ok) {
      const overview = await overviewResponse.json();
      const totals = overview.totals || {};
      return [
        'Current server context:',
        `- Users: ${totals.users ?? 'unknown'}`,
        `- Posts: ${totals.posts ?? 'unknown'}`,
        `- Jobs: ${totals.jobs ?? 'unknown'}`,
        `- Messages: ${totals.messages ?? 'unknown'}`,
        `- Storage status: ${overview.storage?.status || 'unknown'}`,
        `- Database: ${overview.storage?.database || 'unknown'}`,
      ].join('\n');
    }
  } catch (err) {
    console.error('Backend overview context failed:', err);
  }

  return '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!await isAdminRequest(req)) {
    return res.status(403).json({ error: 'Admin role required' });
  }

  const apiKey = cleanEnv(process.env.MIMO_API_KEY) || cleanEnv(process.env.XIAOMIMIMO_API_KEY);
  if (!apiKey) {
    return res.status(500).json({ error: 'AI API key is not configured on Vercel.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { message, conversationHistory = [] } = body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (isCodeWritingRequest(message)) {
    return res.status(200).json({ reply: getScopedRefusal(message) });
  }

  const allowedRoles = new Set(['user', 'assistant']);
  const sanitizedHistory = Array.isArray(conversationHistory)
    ? conversationHistory
      .filter((m) => m && allowedRoles.has(m.role) && typeof m.content === 'string')
      .slice(-20)
    : [];

  try {
    const serverContext = await getServerContext(req);
    const systemMessages = [
      { role: 'system', content: scopedAssistantPrompt },
      ...(serverContext ? [{ role: 'system', content: serverContext }] : []),
    ];

    const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: normalizeMimoModel(process.env.MIMO_MODEL),
        messages: [
          ...systemMessages,
          ...sanitizedHistory,
          { role: 'user', content: message },
        ],
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
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('AI chat error:', err);
    return res.status(500).json({ error: 'Error connecting to AI' });
  }
};
