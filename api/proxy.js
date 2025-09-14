// api/proxy.js
export const config = { api: { bodyParser: false } };

function setCors(req, res) {
  const reqOrigin  = req.headers.origin || '*';
  const reqHeaders = req.headers['access-control-request-headers']; // e.g. "x-mexc-apikey, x-signature, content-type"

  res.setHeader('Access-Control-Allow-Origin', reqOrigin); // boleh '*' kalau mau
  res.setHeader('Vary', 'Origin'); // good practice untuk cache

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  // ❗️echo balik header yang diminta preflight; fallback ke daftar umum
  res.setHeader(
    'Access-Control-Allow-Headers',
    reqHeaders || 'content-type, authorization, x-requested-with, x-mexc-apikey, x-api-key, x-signature, x-timestamp'
  );

  res.setHeader('Access-Control-Max-Age', '86400');
  // opsional:
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end(); // atau .json({ok:true})
  }

  try {
    const target = req.query.url;
    if (!target) return res.status(400).json({ error: 'Missing query param: url' });

    let u;
    try { u = new URL(target); }
    catch { return res.status(400).json({ error: 'Invalid URL' }); }

    // kumpulkan body mentah
    let body;
    if (!['GET','HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }

    // teruskan header (kecuali yang bermasalah)
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      const key = k.toLowerCase();
      if (['host','content-length'].includes(key)) continue;
      headers[key] = v;
    }

    const upstream = await fetch(u.toString(), { method: req.method, headers, body });

    res.status(upstream.status);
    upstream.headers.forEach((v, k) => {
      const key = k.toLowerCase();
      if (['content-length','content-encoding'].includes(key)) return;
      res.setHeader(k, v);
    });

    const buf = Buffer.from(await upstream.arrayBuffer());
    return res.end(buf);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy failed', details: e.message });
  }
}
