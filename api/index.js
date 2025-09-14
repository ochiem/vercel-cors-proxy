import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

function parseProxyParameters(req) {
  const m = req.url.match(/(?:[?&])url=([^&]+)$/);
  return { url: m ? decodeURIComponent(m[1]) : '' };
}

// (opsional) whitelist biar aman
const ALLOWED = ['api.telegram.org', 'indodax.com'];

app.all('/*', async (req, res) => {
  try {
    const { url } = parseProxyParameters(req);
    if (!url) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ title: 'Missing url param' });
    }

    const u = new URL(url);
    if (!ALLOWED.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(403).json({ title: 'Host not allowed' });
    }

    // Forward method/headers/body
    const headers = new Headers();
    // only forward content-type untuk keamanan
    const ct = req.headers['content-type'];
    if (ct) headers.set('content-type', ct);

    const init = {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? (
        ct && ct.includes('application/json') ? JSON.stringify(req.body) : undefined
      ) : undefined,
    };

    const r = await fetch(url, init);
    const buf = await r.arrayBuffer();

    // Passthrough status + content-type
    res.status(r.status);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const rct = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', rct);
    res.send(Buffer.from(buf));
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ title: 'Proxy Error', detail: String(e) });
  }
});

// Preflight
app.options('/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.status(204).end();
});

export default app;
