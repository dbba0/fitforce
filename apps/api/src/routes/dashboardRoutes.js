const express = require('express');
const { getDashboard } = require('../controllers/dashboardController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.get('/', authRequired, getDashboard);

module.exports = router;
