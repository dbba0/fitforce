const mongoose = require('mongoose');

const setSchema = new mongoose.Schema(
  {
    reps: Number,
    loadKg: Number,
    durationSec: Number
  },
  { _id: false }
);

const workoutLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    mode: { type: String, enum: ['home', 'gym'], required: true },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    date: { type: Date, default: Date.now },
    durationMin: { type: Number, required: true },
    caloriesBurned: { type: Number, default: 0 },
    exercises: [
      {
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
        sets: [setSchema]
      }
    ],
    notes: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkoutLog', workoutLogSchema);
