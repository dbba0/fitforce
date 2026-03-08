const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../services/validators');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authRequired, me);

module.exports = router;
