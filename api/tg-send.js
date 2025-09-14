export default async function handler(req, res) {
  // CORS (agar bisa dipanggil dari GitHub Pages/frontend)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ ok:false, error:'Method Not Allowed' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // set di Vercel → Project → Settings → Env
  if (!BOT_TOKEN) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ ok:false, error:'Missing TELEGRAM_BOT_TOKEN' });
  }

  try {
    const { chat_id, text, parse_mode = 'HTML', disable_web_page_preview, disable_notification } = req.body || {};
    if (!chat_id || !text) throw new Error('chat_id & text required');

    const tg = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        chat_id, text, parse_mode,
        disable_web_page_preview, disable_notification
      })
    });
    const data = await tg.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (!tg.ok || !data.ok) {
      return res.status(500).json({ ok:false, error:data?.description || 'Telegram failed', raw:data });
    }
    return res.status(200).json({ ok:true, result:data.result });
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ ok:false, error:String(e) });
  }
}
