const express = require('express');
const { updateProfile, getPublicProfile } = require('../controllers/userController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.patch('/profile', authRequired, updateProfile);
router.get('/:id/profile', authRequired, getPublicProfile);

module.exports = router;
