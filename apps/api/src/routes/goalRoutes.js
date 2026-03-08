const express = require('express');
const { getGoal, upsertGoal, progress } = require('../controllers/goalController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { goalSchema } = require('../services/validators');

const router = express.Router();

router.get('/', authRequired, getGoal);
router.put('/', authRequired, validate(goalSchema), upsertGoal);
router.get('/progress', authRequired, progress);

module.exports = router;
