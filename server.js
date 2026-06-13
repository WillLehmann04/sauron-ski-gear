require('dotenv').config();
const express = require('express');
const compression = require('compression');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();

// Proxy hops in front of the app so req.ip reflects the real client:
// 1 = local/dev (none or one), 2 in production (Cloudflare -> Caddy -> app).
// Getting this wrong makes the rate limiter bucket everyone under the CDN's IPs.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Gzip/deflate responses (HTML, CSS, JS) — biggest load-time win for text assets.
app.use(compression());

// Baseline security headers (no CSP: the page uses inline scripts + CDN Vue/fonts).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Tiny payloads only — the waitlist sends an email and maybe a shop name.
app.use(express.json({ limit: '8kb' }));
app.use(express.urlencoded({ extended: true, limit: '8kb' }));

// Brand assets rarely change → long cache; everything else short + ETag revalidation.
app.use('/images', express.static(path.join(__dirname, 'public/images'), { maxAge: '30d' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// ── Lightweight in-memory rate limiter (single instance; resets on restart) ──
const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || 'unknown';
    let bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + windowMs };
      rateBuckets.set(ip, bucket);
    }
    bucket.count++;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.reset - now) / 1000));
      return res.status(429).json({ ok: false, error: 'Too many requests. Please try again in a minute.' });
    }
    next();
  };
}
// Purge expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateBuckets) if (now > bucket.reset) rateBuckets.delete(ip);
}, 5 * 60 * 1000).unref();

app.use('/', require('./routes/index'));
app.use('/waitlist', rateLimit({ windowMs: 60 * 1000, max: 8 }), require('./routes/waitlist'));
// eBay account-deletion notification endpoint (validation + notifications).
// Not rate-limited — eBay's handshake and notifications must always get through.
app.use('/deletion', require('./routes/ebay-deletion'));

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set a different PORT in your .env file.`);
    process.exit(1);
  }
  throw err;
});
