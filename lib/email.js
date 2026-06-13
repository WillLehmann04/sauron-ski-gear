// Minimal Resend transport for transactional email sent from the app request
// path. Uses the same Resend REST endpoint and RESEND_API_KEY as the nightly
// backup report (deploy/backup-db.sh), so the app and the cron share one
// mailing setup.
//
// Sending is best-effort by design: a missing API key disables it (returns
// { skipped: true }) and any failure returns { ok: false, error } rather than
// throwing — so an email problem can never break the operation that triggered
// it (e.g. a waitlist signup). Callers log the result; they don't depend on it.

const RESEND_API_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';
const SEND_TIMEOUT_MS = 15000;

async function send({ from, to, subject, html, text, replyTo } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };
  if (!from || !to || !subject) {
    return { ok: false, error: 'email: from, to and subject are required' };
  }

  const payload = { from, to: Array.isArray(to) ? to : [to], subject };
  if (html) payload.html = html;
  if (text) payload.text = text;
  if (replyTo) payload.reply_to = replyTo; // Resend's field name

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `email: Resend ${res.status} ${body}`.trim() };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, id: data.id };
  } catch (err) {
    return { ok: false, error: `email: ${err.message}` };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { send };
