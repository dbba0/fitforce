const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    mode: { type: String, enum: ['home', 'gym'], required: true },
    level: { type: String, enum: ['debutant', 'intermediaire', 'avance'], default: 'debutant' },
    daysPerWeek: { type: Number, default: 3 },
    tags: [String],
    sessions: [
      {
        dayLabel: String,
        focus: String,
        exercises: [
          {
            exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' },
            sets: Number,
            reps: String,
            restSec: Number,
            targetLoadKg: Number
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Program', programSchema);
