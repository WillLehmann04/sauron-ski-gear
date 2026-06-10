const storage = require('../lib/storage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Consumer and shop signups are kept in separate collections so the two
// demand signals can be measured independently.
const COLLECTIONS = {
  consumer: 'waitlist',
  shop: 'shops',
};

function signup({ email, name, type, shopName } = {}) {
  const audience = type === 'shop' ? 'shop' : 'consumer';
  const collection = COLLECTIONS[audience];
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return { ok: false, status: 422, error: 'Invalid email address.' };
  }

  if (audience === 'shop' && !(shopName || '').trim()) {
    return { ok: false, status: 422, error: 'Shop name is required.' };
  }

  const list = storage.read(collection);

  if (list.some(entry => entry.email === normalizedEmail)) {
    return { ok: false, status: 409, error: 'This email is already on the list.' };
  }

  const entry = {
    email: normalizedEmail,
    name: name ? name.trim() : '',
    createdAt: new Date().toISOString(),
  };
  if (audience === 'shop') entry.shopName = shopName.trim();

  list.push(entry);
  storage.write(collection, list);
  return { ok: true };
}

module.exports = { signup };
