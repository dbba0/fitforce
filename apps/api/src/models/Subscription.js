const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    provider: { type: String, enum: ['stripe', 'apple', 'google'], default: 'stripe' },
    status: { type: String, enum: ['inactive', 'active', 'canceled'], default: 'inactive' },
    currentPeriodEnd: Date,
    externalCustomerId: String,
    externalSubscriptionId: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
