const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['push', 'pull', 'legs', 'upper', 'lower', 'core', 'hiit', 'full_body'],
      required: true
    },
    equipment: {
      type: String,
      enum: ['none', 'dumbbells', 'machine', 'barbell', 'bodyweight', 'mixed'],
      default: 'bodyweight'
    },
    mode: { type: String, enum: ['home', 'gym', 'both'], default: 'both' },
    description: String,
    videoUrl: String,
    muscleGroups: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exercise', exerciseSchema);
