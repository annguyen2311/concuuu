const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'MiMo-V2.5-Pro';

const sameLanguagePrompt = `You are the AI assistant for Cong dong sinh vien NTTU, a student community website.

Help users with study, campus life, posts, jobs, and general questions. Respond concisely in the same language the user writes in, especially Vietnamese when the user writes Vietnamese.`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.MIMO_API_KEY || process.env.XIAOMIMIMO_API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'AI API key is not configured on Vercel.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { message, conversationHistory = [] } = body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const allowedRoles = new Set(['user', 'assistant']);
  const sanitizedHistory = Array.isArray(conversationHistory)
    ? conversationHistory
      .filter((m) => m && allowedRoles.has(m.role) && typeof m.content === 'string')
      .slice(-20)
    : [];

  try {
    const response = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL,
        messages: [
          { role: 'system', content: sameLanguagePrompt },
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