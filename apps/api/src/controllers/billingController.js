const Stripe = require('stripe');
const { stripeSecretKey } = require('../config/env');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

async function createCheckoutSession(req, res) {
  if (!stripe) {
    return res.status(400).json({ message: 'Stripe not configured' });
  }

  const { successUrl, cancelUrl, priceId } = req.body;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: req.user.email,
    metadata: { userId: req.user._id.toString() }
  });

  return res.json({ url: session.url, sessionId: session.id });
}

async function mockActivatePremium(req, res) {
  await Subscription.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      provider: 'stripe',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    { upsert: true, new: true }
  );

  const user = await User.findByIdAndUpdate(req.user._id, { isPremium: true }, { new: true });
  return res.json({ message: 'Premium activated', user });
}

module.exports = { createCheckoutSession, mockActivatePremium };
