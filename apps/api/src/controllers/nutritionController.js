const NutritionLog = require('../models/NutritionLog');
const HydrationLog = require('../models/HydrationLog');

function getCalorieSuggestion(goalType, weightKg = 70, heightCm = 170, age = 30) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  switch (goalType) {
    case 'prise_de_masse':
      return Math.round(bmr * 1.35 + 300);
    case 'perte_de_poids':
      return Math.round(bmr * 1.25 - 350);
    case 'endurance':
      return Math.round(bmr * 1.45);
    default:
      return Math.round(bmr * 1.3);
  }
}

async function addNutritionLog(req, res) {
  const log = await NutritionLog.create({ ...req.validatedBody, user: req.user._id });
  return res.status(201).json({ log });
}

async function addHydrationLog(req, res) {
  const log = await HydrationLog.create({ ...req.validatedBody, user: req.user._id });
  return res.status(201).json({ log });
}

async function getNutritionSummary(req, res) {
  const today = new Date();
  const dayStart = new Date(today.setHours(0, 0, 0, 0));

  const [nutrition, hydration] = await Promise.all([
    NutritionLog.find({ user: req.user._id, date: { $gte: dayStart } }),
    HydrationLog.find({ user: req.user._id, date: { $gte: dayStart } })
  ]);

  const totals = nutrition.reduce(
    (acc, item) => {
      acc.calories += item.calories || 0;
      acc.proteinG += item.proteinG || 0;
      acc.carbsG += item.carbsG || 0;
      acc.fatsG += item.fatsG || 0;
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatsG: 0 }
  );

  const hydrationMl = hydration.reduce((acc, item) => acc + (item.ml || 0), 0);
  const suggestion = getCalorieSuggestion(
    req.user.goalType,
    req.user.weightKg,
    req.user.heightCm,
    req.user.age
  );

  return res.json({
    today: {
      ...totals,
      hydrationMl,
      calorieSuggestion: suggestion
    }
  });
}

module.exports = { addNutritionLog, addHydrationLog, getNutritionSummary };
