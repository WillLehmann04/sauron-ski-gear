const router = require('express').Router();
const waitlistService = require('../services/waitlist');

router.post('/', (req, res) => {
  const { email, name, type, shopName, hp } = req.body;
  const result = waitlistService.signup({ email, name, type, shopName, hp });
  // 201 for a new entry, 200 when already on the list, 4xx otherwise.
  const status = result.ok ? (result.duplicate ? 200 : 201) : result.status;
  res.status(status).json(result);
});

module.exports = router;
