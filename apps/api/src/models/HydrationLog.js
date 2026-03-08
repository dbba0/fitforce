const mongoose = require('mongoose');

const hydrationLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now },
    ml: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('HydrationLog', hydrationLogSchema);
