import crypto from 'crypto';

export const config = { api: { bodyParser: true } };

function signRequest(privateKeyPem, timestamp, method, path) {
  const msgString = timestamp + method.toUpperCase() + path;
  const sign = crypto.createSign('SHA256');
  sign.update(msgString);
  sign.end();
  return sign.sign({ key: privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST }, 'base64');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,KALSHI-ACCESS-KEY');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const path = req.query.path || '';
  const env = req.query.env || 'prod';
  const base = env === 'prod'
    ? 'https://api.elections.kalshi.com/trade-api/v2'
    : 'https://demo-api.kalshi.co/trade-api/v2';

  const keyId = req.headers['kalshi-access-key'] || process.env.KALSHI_KEY_ID || '';
  const privateKeyPem = process.env.KALSHI_PRIVATE_KEY || '';

  const timestamp = Date.now().toString();
  const apiPath = '/trade-api/v2' + path;

  const hdrs = { 'Content-Type': 'application/json' };
  if (keyId) hdrs['KALSHI-ACCESS-KEY'] = keyId;
  if (privateKeyPem && keyId) {
    try {
      const sig = signRequest(privateKeyPem, timestamp, req.method, apiPath);
      hdrs['KALSHI-ACCESS-TIMESTAMP'] = timestamp;
      hdrs['KALSHI-ACCESS-SIGNATURE'] = sig;
    } catch(e) {
      console.error('Signing error:', e.message);
    }
  }

  try {
    const opts = { method: req.method, headers: hdrs };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      opts.body = JSON.stringify(req.body);
    }
    const r = await fetch(base + path, opts);
    const text = await r.text();
    let out;
    try { out = JSON.parse(text); } catch(e) { out = { raw: text }; }
    res.status(r.status).json(out);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
