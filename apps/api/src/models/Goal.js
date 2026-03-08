const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    targetWeightKg: Number,
    sessionsPerWeek: { type: Number, default: 3 },
    weeklyCaloriesTarget: { type: Number, default: 1500 },
    targetWaistCm: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('Goal', goalSchema);
