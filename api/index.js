// api/index.js (Vercel)
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

function getUrl(req){
  const m = req.url.match(/[?&]url=([^&]+)$/);
  return m ? decodeURIComponent(m[1]) : '';
}

const ALLOWED = ['api.telegram.org','indodax.com'];

app.all('/*', async (req, res) => {
  try {
    const url = getUrl(req);
    if (!url) return res.status(400).json({ title:'Missing url param' });

    const u = new URL(url);
    if (!ALLOWED.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))) {
      res.setHeader('Access-Control-Allow-Origin','*');
      return res.status(403).json({ title:'Host not allowed' });
    }

    // forward minimal header yg aman
    const headers = new Headers();
    const ct = req.headers['content-type'];
    if (ct) headers.set('content-type', ct);
    // minta respon terkompres, nanti kita passtrough headernya
    headers.set('accept-encoding','gzip,br');

    const init = {
      method: req.method,
      headers,
      body: (req.method !== 'GET' && req.method !== 'HEAD')
        ? (ct?.includes('application/json') ? JSON.stringify(req.body) : undefined)
        : undefined,
    };

    const r = await fetch(url, init);
    const buf = await r.arrayBuffer();

    // teruskan status + content-type + content-encoding agar browser paham
    res.status(r.status);
    res.setHeader('Access-Control-Allow-Origin','*');
    const ct2 = r.headers.get('content-type');         if (ct2) res.setHeader('Content-Type', ct2);
    const ce2 = r.headers.get('content-encoding');     if (ce2) res.setHeader('Content-Encoding', ce2);
    const vary= r.headers.get('vary');                 if (vary) res.setHeader('Vary', vary);
    const cache=r.headers.get('cache-control');        if (cache)res.setHeader('Cache-Control', cache);

    return res.send(Buffer.from(buf));
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(500).json({ title:'Proxy Error', detail:String(e) });
  }
});

// preflight
app.options('/*',(req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.status(204).end();
});

export default app;
