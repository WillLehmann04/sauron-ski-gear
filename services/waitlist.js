const storage = require('../lib/storage');
const waitlistEmail = require('./waitlist-email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Consumer and shop signups are kept in separate collections so the two
// demand signals can be measured independently.
const COLLECTIONS = {
  consumer: 'waitlist',
  shop: 'shops',
};

// Field length caps — anything longer is hostile or a mistake, not a signup.
const MAX_EMAIL = 254;
const MAX_NAME = 80;
const MAX_SHOP_NAME = 120;

// JSON bodies can carry arrays/objects where strings are expected; coerce
// instead of throwing so malformed input gets a 422, never a 500.
function asString(value) {
  return typeof value === 'string' ? value : '';
}

function signup({ email, name, type, shopName, hp } = {}) {
  // Honeypot: humans never see this field, bots fill it. Silently accept
  // (so the bot thinks it worked) without storing, keeping demand data clean.
  if (asString(hp).trim()) return { ok: true };

  const audience = type === 'shop' ? 'shop' : 'consumer';
  const collection = COLLECTIONS[audience];
  const normalizedEmail = asString(email).toLowerCase().trim();
  const normalizedName = asString(name).trim().slice(0, MAX_NAME);
  const normalizedShopName = asString(shopName).trim().slice(0, MAX_SHOP_NAME);

  if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL || !EMAIL_RE.test(normalizedEmail)) {
    return { ok: false, status: 422, error: 'Invalid email address.' };
  }

  if (audience === 'shop' && !normalizedShopName) {
    return { ok: false, status: 422, error: 'Shop name is required.' };
  }

  const list = storage.read(collection);

  // A repeat signup is a success, not an error — the goal (be on the list)
  // is already met. Flag it so the UI can acknowledge without re-storing.
  if (list.some(entry => entry.email === normalizedEmail)) {
    return { ok: true, duplicate: true };
  }

  const entry = {
    email: normalizedEmail,
    name: normalizedName,
    createdAt: new Date().toISOString(),
  };
  if (audience === 'shop') entry.shopName = normalizedShopName;

  list.push(entry);
  storage.write(collection, list);

  // Welcome the new consumer (B2C only). Fire-and-forget: a mail failure must
  // never fail the signup, and the request shouldn't wait on Resend.
  if (audience === 'consumer') {
    waitlistEmail.sendWelcome(entry).catch(err =>
      console.error('waitlist welcome email failed:', err && err.message));
  }

  return { ok: true };
}

module.exports = { signup };
