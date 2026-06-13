const router = require('express').Router();
const ebayDeletion = require('../services/ebay-deletion');

// eBay Marketplace Account Deletion/Closure notification endpoint.
// Required for eBay API production access. Mounted at /deletion.

// GET = eBay's one-time endpoint-validation handshake.
router.get('/', (req, res) => {
  const challengeCode = req.query.challenge_code;
  if (!challengeCode) {
    return res.status(400).json({ error: 'challenge_code query parameter is required' });
  }
  try {
    res.status(200).json({ challengeResponse: ebayDeletion.challengeResponse(String(challengeCode)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST = an actual account-deletion notification. PowVal stores no eBay user
// data, so there is nothing to erase — acknowledge with 200 so eBay marks it
// delivered (it retries on non-2xx).
router.post('/', (req, res) => {
  res.status(200).json({ ok: true });
});

module.exports = router;
