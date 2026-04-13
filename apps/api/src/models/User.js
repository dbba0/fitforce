const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String },
    authProvider: { type: String, enum: ['email', 'google', 'apple'], default: 'email' },
    fullName: { type: String, required: true },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: null },
    age: Number,
    weightKg: Number,
    heightCm: Number,
    level: { type: String, enum: ['debutant', 'intermediaire', 'avance'], default: 'debutant' },
    goalType: {
      type: String,
      enum: ['prise_de_masse', 'perte_de_poids', 'endurance', 'recomposition'],
      default: 'recomposition'
    },
    isPremium: { type: Boolean, default: false },
    xp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date },
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privacy: {
      showProfile: { type: Boolean, default: true },
      showGoals: { type: Boolean, default: true },
      showAchievements: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      showPosts: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
