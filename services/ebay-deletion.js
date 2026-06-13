'use strict';

// eBay Marketplace Account Deletion/Closure — endpoint validation.
//
// When you save the notification endpoint in eBay's developer portal, eBay
// sends a GET handshake with a `challenge_code`, and expects back:
//   { "challengeResponse": sha256hex(challengeCode + verificationToken + endpoint) }
// The verification token and endpoint URL must EXACTLY match the values entered
// in the portal (Alerts & Notifications), so both come from config — never
// hardcoded.

const crypto = require('crypto');

function challengeResponse(challengeCode) {
  const token = process.env.EBAY_DELETION_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  if (!token || !endpoint) {
    throw new Error(
      'eBay deletion: EBAY_DELETION_VERIFICATION_TOKEN and EBAY_DELETION_ENDPOINT must be set'
    );
  }
  // Hashing the three parts in sequence is identical to hashing their
  // concatenation, in the order eBay specifies.
  return crypto
    .createHash('sha256')
    .update(challengeCode)
    .update(token)
    .update(endpoint)
    .digest('hex');
}

function isConfigured() {
  return Boolean(
    process.env.EBAY_DELETION_VERIFICATION_TOKEN && process.env.EBAY_DELETION_ENDPOINT
  );
}

module.exports = { challengeResponse, isConfigured };
