// Vercel Serverless Function to proxy Telegram Bot API calls
// Usage: POST /api/telegram with JSON body
// { text, chat_id, token, parse_mode = 'HTML', disable_web_page_preview = true }

export default async function handler(req, res) {
  // CORS preflight support
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      text,
      message,
      chat_id,
      parse_mode = 'HTML',
      disable_web_page_preview = true,
      token
    } = body;

    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || token;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID || chat_id;

    if (!BOT_TOKEN || !CHAT_ID) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(400).json({ ok: false, error: 'Missing bot token or chat id' });
      return;
    }

    const payload = {
      chat_id: CHAT_ID,
      text: text || message || '',
      parse_mode,
      disable_web_page_preview
    };

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await tgRes.json().catch(() => ({}));

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!tgRes.ok || result?.ok === false) {
      res.status(tgRes.status || 502).json({ ok: false, error: result?.description || 'Telegram error', status: tgRes.status });
      return;
    }

    res.status(200).json(result);
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ ok: false, error: err?.message || 'Internal error' });
  }
}

