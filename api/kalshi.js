import crypto from "crypto";

export const config = { api: { bodyParser: true } };

function normalizePrivateKey(pem) {
  const normalized = (pem || "").replace(/\\n/g, "\n");

  if (normalized.includes("-----BEGIN")) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) {
      return decoded;
    }
  } catch {
    // fall through to return normalized value
  }

  return normalized;
}

function sign(pem, ts, method, path) {
  const key = normalizePrivateKey(pem);
  const signPath = path.split("?")[0];
  const s = crypto.createSign("SHA256");
  s.update(ts + method.toUpperCase() + signPath);
  s.end();
  return s.sign(
    {
      key,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    },
    "base64",
  );
}

function requiresAuth(method, path) {
  return method !== "GET" || path.startsWith("/portfolio");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,KALSHI-ACCESS-KEY");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const path = req.query.path || "";
  const env = req.query.env || "prod";
  const base =
    env === "prod"
      ? "https://api.elections.kalshi.com/trade-api/v2"
      : "https://demo-api.kalshi.co/trade-api/v2";
  const keyId = process.env.KALSHI_KEY_ID || "";
  const pem = process.env.KALSHI_PRIVATE_KEY || "";
  const ts = Date.now().toString();
  const apiPath = "/trade-api/v2" + path;
  const hdrs = { "Content-Type": "application/json" };

  if (keyId) hdrs["KALSHI-ACCESS-KEY"] = keyId;

  if (pem && keyId) {
    try {
      const sig = sign(pem, ts, req.method, apiPath);
      hdrs["KALSHI-ACCESS-TIMESTAMP"] = ts;
      hdrs["KALSHI-ACCESS-SIGNATURE"] = sig;
    } catch (e) {
      console.error("Signing error:", e.message);
      if (requiresAuth(req.method, path)) {
        res.status(500).json({ error: "signing_failed", detail: e.message });
        return;
      }
    }
  }

  try {
    const opts = { method: req.method, headers: hdrs };
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      opts.body = JSON.stringify(req.body);
    }
    const r = await fetch(base + path, opts);
    const text = await r.text();
    let out;
    try {
      out = JSON.parse(text);
    } catch {
      out = { raw: text };
    }
    res.status(r.status).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
