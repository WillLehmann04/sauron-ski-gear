const router = require('express').Router();
const roadmap = require('../content/roadmap');
const changelog = require('../content/changelog');

router.get('/', (req, res) => res.render('index'));

router.get('/roadmap', (req, res) =>
  res.render('roadmap', { pageTitle: 'Roadmap · PowVal', roadmap })
);

router.get('/changelog', (req, res) =>
  res.render('changelog', { pageTitle: 'Changelog · PowVal', changelog })
);

module.exports = router;
