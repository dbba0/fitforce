const express = require('express');
const { authRequired } = require('../middleware/auth');
const { listSessions, createSession } = require('../controllers/sessionController');

const router = express.Router();

router.get('/', authRequired, listSessions);
router.post('/', authRequired, createSession);

module.exports = router;

