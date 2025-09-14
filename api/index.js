// index.js (proxy generic)
import express from 'express';
import cors from 'cors';
import request from 'request'; // deprecated; bisa ganti node-fetch/undici nanti

const app = express();
app.use(cors());
app.use(express.json({ limit:'2mb' })); // penting utk POST JSON
app.use(express.urlencoded({ extended:true }));

function parseProxyParameters(proxyRequest){
  const params = {};
  const urlMatch = proxyRequest.url.match(/(?<=[?&])url=(?<url>.*)$/);
  if (urlMatch) params.url = decodeURIComponent(urlMatch.groups.url);
  return params;
}

const ALLOWED_HOSTS = [
  'api.telegram.org',
  'indodax.com'
];

app.all('/*', (req, res) => {
  try {
    const { url } = parseProxyParameters(req);
    if (!url) {
      return res.status(400).json({
        title: 'CORS Proxy Error - Required parameter is missing',
        detail: 'The parameter: url was not provided',
      });
    }

    const u = new URL(url);
    if (!ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith(`.${h}`))) {
      return res.status(403).json({ title:'CORS Proxy Error', detail:'Host not allowed' });
    }

    // Buang header yang tidak boleh diteruskan
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.origin;
    delete headers.referer;

    const opts = {
      url,
      method: req.method,          // <- penting: forward method
      headers,                     // <- penting: forward headers (sudah difilter)
      json: true
    };

    // Forward body utk POST/PUT/PATCH
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length) {
      opts.body = req.body;        // kirim sebagai JSON
    }

    // Jalankan request dan pipe balik
    request(opts)
      .on('response', r => {
        res.setHeader('Access-Control-Allow-Origin', '*');
      })
      .on('error', err => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(500).json({ title:'CORS Proxy Error', detail: err.message });
      })
      .pipe(res);

  } catch (err) {
    console.error(err);
    res.status(500).json({ title:'CORS Proxy Error - Internal server error', detail: err.message });
  }
});

// Preflight
app.options('/*', (req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.status(204).end();
});

export default app;
