const mongoose = require('mongoose');

const nutritionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, default: Date.now },
    calories: { type: Number, required: true },
    proteinG: Number,
    carbsG: Number,
    fatsG: Number,
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], default: 'lunch' },
    note: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
