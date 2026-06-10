const router = require('express').Router();
const waitlistService = require('../services/waitlist');

router.post('/', (req, res) => {
  const { email, name, type, shopName, hp } = req.body;
  const result = waitlistService.signup({ email, name, type, shopName, hp });
  res.status(result.ok ? 201 : result.status).json(result);
});

module.exports = router;
