const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    programId: { type: String, required: true },
    clientId: { type: String, index: true },
    date: { type: Date, default: Date.now },
    durationMin: { type: Number, required: true, min: 1, max: 600 },
    calories: { type: Number, default: 0, min: 0, max: 5000 },
    completed: { type: Boolean, default: true },
    type: { type: String, enum: ['strength', 'cardio'], default: 'strength' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
