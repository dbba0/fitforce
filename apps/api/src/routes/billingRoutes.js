const express = require('express');
const { createCheckoutSession, mockActivatePremium } = require('../controllers/billingController');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/checkout-session', authRequired, createCheckoutSession);
router.post('/mock-activate', authRequired, mockActivatePremium);

module.exports = router;
