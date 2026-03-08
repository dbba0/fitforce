const express = require('express');
const { authRequired } = require('../middleware/auth');
const { analyzeMorphology, getMorphologyHistory } = require('../controllers/morphologyController');

const router = express.Router();

router.post('/analyze', authRequired, analyzeMorphology);
router.get('/history', authRequired, getMorphologyHistory);

module.exports = router;

