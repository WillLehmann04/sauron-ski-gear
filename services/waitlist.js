const storage = require('../lib/storage');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signup(email, name) {
  const normalizedEmail = (email || '').toLowerCase().trim();

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return { ok: false, status: 422, error: 'Invalid email address.' };
  }

  const list = storage.read('waitlist');

  if (list.some(entry => entry.email === normalizedEmail)) {
    return { ok: false, status: 409, error: 'This email is already on the waitlist.' };
  }

  list.push({
    email: normalizedEmail,
    name: name ? name.trim() : '',
    createdAt: new Date().toISOString(),
  });

  storage.write('waitlist', list);
  return { ok: true };
}

module.exports = { signup };
