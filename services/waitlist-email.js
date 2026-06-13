// Renders and sends the B2C waitlist welcome email
// (emails/templates/waitlist-welcome.hbs) through the shared Resend transport.
//
// Only consumers get this — shops are a separate audience with their own
// (future) flow. Best-effort: if the sender isn't configured it no-ops, and
// the signup path never awaits the result (see services/waitlist.js).

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const mailer = require('../lib/email');

const TEMPLATE_PATH = path.join(__dirname, '../emails/templates/waitlist-welcome.hbs');
// Compile once at startup — the template doesn't change at runtime.
const renderHtml = Handlebars.compile(fs.readFileSync(TEMPLATE_PATH, 'utf8'));

const SUBJECT = "You're on the powval waitlist";

// Plain-text alternative — better deliverability, and the fallback for clients
// with HTML/images off. Kept in step with the .hbs copy.
function plainText(name) {
  return [
    name ? `Hey ${name},` : 'Hey there,',
    '',
    "You're on the powval waitlist. We're building the straight answer to one",
    "question: what's your ski and snowboard gear actually worth. When you can",
    "price it and sell it here, you'll be first to know.",
    '',
    'The roadmap:  https://powval.com/roadmap',
    "What's new:   https://powval.com/changelog",
    '',
    "Know someone sitting on gear they'll never ride again? Send them our way:",
    'https://powval.com',
    '',
    'See you on the hill,',
    'The powval crew',
  ].join('\n');
}

async function sendWelcome({ email: to, name } = {}) {
  const from = process.env.WAITLIST_EMAIL_FROM;
  // No sender configured → the welcome email is disabled (signups still work).
  if (!from || !to) return { ok: false, skipped: true };

  return mailer.send({
    from,
    to,
    subject: SUBJECT,
    html: renderHtml({ name }),
    text: plainText(name),
    replyTo: process.env.WAITLIST_EMAIL_REPLY_TO || undefined,
  });
}

module.exports = { sendWelcome };
