const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getPrivacy, updatePrivacy } = require('../controllers/privacyController');

const router = express.Router();

router.get('/', authRequired, getPrivacy);
router.put('/', authRequired, updatePrivacy);

module.exports = router;

