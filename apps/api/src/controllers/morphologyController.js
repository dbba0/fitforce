const MorphologyAnalysis = require('../models/MorphologyAnalysis');
const User = require('../models/User');

const DISCLAIMER =
  "Cette analyse est une estimation informative, non medicale, et ne remplace pas l'avis d'un professionnel de sante.";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashSeed(input = '') {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function seededRange(seed, min, max) {
  const span = max - min;
  return min + (seed % (span + 1));
}

function estimateBodyFat({ sex = 'male', weightKg = 75, heightCm = 175, age = 28 }) {
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const sexFactor = sex === 'female' ? 5.4 : 0;
  const bodyFat = 1.2 * bmi + 0.23 * age - 10.8 * (sex === 'male' ? 1 : 0) - 5.4 + sexFactor;
  return clamp(Number(bodyFat.toFixed(1)), 7, 45);
}

function inferMorphotype({ bmi, muscleIndex }) {
  const ecto = clamp(Math.round(65 - bmi * 2 + (50 - muscleIndex) * 0.3), 10, 70);
  const endo = clamp(Math.round((bmi - 20) * 3 + (55 - muscleIndex) * 0.2), 10, 70);
  const meso = clamp(100 - ecto - endo, 10, 80);
  const sum = ecto + meso + endo;
  return {
    ectomorphe: Math.round((ecto / sum) * 100),
    mesomorphe: Math.round((meso / sum) * 100),
    endomorphe: Math.round((endo / sum) * 100)
  };
}

function targetCalories({ weightKg = 75, heightCm = 175, age = 28, objective = 'recomposition' }) {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * 1.45;

  if (objective === 'perte_de_poids') return Math.round(tdee - 350);
  if (objective === 'prise_de_masse') return Math.round(tdee + 300);
  if (objective === 'endurance') return Math.round(tdee + 150);
  return Math.round(tdee);
}

function buildRecommendations({ objective, weakAreas, strongAreas, postureScore, bodyFat }) {
  const byObjective = {
    prise_de_masse: 'Prioriser surcharge progressive, volume moyen-eleve, et surplus calorique controle.',
    perte_de_poids: 'Accent sur deficit calorique, cardio zone 2, et musculation pour conserver la masse maigre.',
    endurance: 'Monter progressivement le volume cardio et maintenir 2-3 seances force/semaine.',
    recomposition: 'Equilibrer musculation + nutrition haute en proteines avec suivi de progression hebdomadaire.'
  };

  const targetedExercises = [];
  if (weakAreas.includes('Dos')) targetedExercises.push('Rowing barre, Tractions assistees, Face pulls');
  if (weakAreas.includes('Pectoraux')) targetedExercises.push('Developpe incline, Pompes lentes, Ecartes halteres');
  if (weakAreas.includes('Jambes')) targetedExercises.push('Squat, Fentes bulgares, Souleve de terre roumain');
  if (weakAreas.includes('Core')) targetedExercises.push('Planche chargee, Dead bug, Pallof press');
  if (weakAreas.includes('Epaules')) targetedExercises.push('Developpe militaire, Elevations laterales, Oiseau');

  return {
    pointsForts: strongAreas.map((a) => `${a}: bon potentiel actuel, conserver la progression.`),
    pointsAAmeliorer: weakAreas.map((a) => `${a}: augmenter la frequence et le volume cible.`),
    conseilsPersonnalises: [
      byObjective[objective] || byObjective.recomposition,
      postureScore < 60
        ? 'Ajouter 10 minutes de mobilite thoracique et hanche apres chaque seance.'
        : 'Posture globalement stable: maintenir le travail de gainage et de mobilite.',
      bodyFat > 24
        ? 'Monter progressivement le NEAT (pas quotidiens) et prioriser aliments peu transformes.'
        : 'Conserver un apport proteique eleve et un sommeil regulier pour optimiser la recomposition.'
    ],
    exercicesCibles: targetedExercises.length > 0 ? targetedExercises : ['Programme complet Push/Pull/Legs + Core'],
    programmeSuggere:
      objective === 'endurance'
        ? ['2x full-body', '2x cardio zone 2', '1x intervalles']
        : objective === 'perte_de_poids'
          ? ['3x full-body', '2x cardio modere', '1x HIIT court']
          : ['Push/Pull/Legs', 'Upper/Lower', '1 jour cardio recup']
  };
}

function buildNutritionPlan({ objective, caloriesTarget, weightKg }) {
  const protein = Math.round(weightKg * 2);
  const fats = Math.round(weightKg * 0.9);
  const proteinKcal = protein * 4;
  const fatsKcal = fats * 9;
  const carbs = Math.max(80, Math.round((caloriesTarget - proteinKcal - fatsKcal) / 4));

  return {
    caloriesCible: caloriesTarget,
    macros: { proteinesG: protein, glucidesG: carbs, lipidesG: fats },
    conseils: [
      objective === 'perte_de_poids'
        ? 'Construire les repas autour de proteines maigres + legumes volumineux.'
        : 'Repartir les proteines sur 3 a 5 repas pour optimiser la synthese proteique.',
      'Hydratation cible: 30 a 40 ml/kg/jour.',
      'Ajuster les portions toutes les 2 semaines selon progression et energie.'
    ]
  };
}

function buildReport({ photos, user, objective, previous }) {
  const seedInput = `${photos.front || ''}${photos.side || ''}${photos.back || ''}${user._id.toString()}`;
  const seed = hashSeed(seedInput);
  const weightKg = user.weightKg || 75;
  const heightCm = user.heightCm || 175;
  const age = user.age || 28;
  const bmi = weightKg / ((heightCm / 100) ** 2);

  const muscleScores = {
    Pectoraux: seededRange(seed + 11, 45, 85),
    Dos: seededRange(seed + 21, 45, 85),
    Epaules: seededRange(seed + 31, 45, 85),
    Bras: seededRange(seed + 41, 45, 85),
    Core: seededRange(seed + 51, 45, 85),
    Jambes: seededRange(seed + 61, 45, 85)
  };
  const avgMuscle = Object.values(muscleScores).reduce((a, b) => a + b, 0) / 6;

  const bodyFat = estimateBodyFat({
    sex: 'male',
    weightKg,
    heightCm,
    age
  });

  const posture = {
    score: seededRange(seed + 71, 48, 86),
    note:
      seededRange(seed + 72, 0, 100) > 55
        ? 'Alignement global correct avec leger enroulement des epaules.'
        : 'Legere anteversion des epaules et manque de stabilite du tronc.'
  };

  const proportions = {
    epaulesTaille: Number((1.2 + ((seed % 20) - 10) / 100).toFixed(2)),
    troncJambes: Number((0.96 + ((seed % 14) - 7) / 100).toFixed(2)),
    symetrieGaucheDroite: seededRange(seed + 81, 78, 96)
  };

  const sortedAreas = Object.entries(muscleScores).sort((a, b) => b[1] - a[1]);
  const strongAreas = sortedAreas.slice(0, 2).map((e) => e[0]);
  const weakAreas = sortedAreas.slice(-2).map((e) => e[0]);
  const morphotype = inferMorphotype({ bmi, muscleIndex: avgMuscle });
  const caloriesTarget = targetCalories({ weightKg, heightCm, age, objective });

  const recommendations = buildRecommendations({
    objective,
    weakAreas,
    strongAreas,
    postureScore: posture.score,
    bodyFat
  });
  const nutrition = buildNutritionPlan({ objective, caloriesTarget, weightKg });

  const trend = previous
    ? {
        bodyFatDelta: Number((bodyFat - (previous.report?.metrics?.bodyFatPercent || bodyFat)).toFixed(1)),
        postureDelta: posture.score - (previous.report?.posture?.score || posture.score)
      }
    : null;

  return {
    disclaimer: DISCLAIMER,
    objective,
    metrics: {
      bmi: Number(bmi.toFixed(1)),
      bodyFatPercent: bodyFat
    },
    proportions,
    muscleScores,
    posture,
    morphotype,
    strongAreas,
    weakAreas,
    recommendations,
    nutrition,
    trend
  };
}

async function analyzeMorphology(req, res) {
  const photos = req.body?.photos || {};
  if (!photos.front && !photos.side && !photos.back) {
    return res.status(400).json({ message: 'At least one photo is required' });
  }

  const user = await User.findById(req.user._id);
  const objective = req.body?.objective || user.goalType || 'recomposition';
  const previous = await MorphologyAnalysis.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  const report = buildReport({ photos, user, objective, previous });

  const analysis = await MorphologyAnalysis.create({
    user: req.user._id,
    photos: {
      front: photos.front || '',
      side: photos.side || '',
      back: photos.back || ''
    },
    objective,
    report
  });

  return res.status(201).json({
    analysis: {
      id: analysis._id.toString(),
      createdAt: analysis.createdAt,
      report: analysis.report
    }
  });
}

async function getMorphologyHistory(req, res) {
  const analyses = await MorphologyAnalysis.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(24)
    .select('createdAt report objective');

  return res.json({
    history: analyses.map((a) => ({
      id: a._id.toString(),
      createdAt: a.createdAt,
      objective: a.objective,
      summary: {
        bodyFatPercent: a.report?.metrics?.bodyFatPercent ?? null,
        postureScore: a.report?.posture?.score ?? null,
        strongAreas: a.report?.strongAreas || [],
        weakAreas: a.report?.weakAreas || []
      },
      report: a.report
    }))
  });
}

module.exports = { analyzeMorphology, getMorphologyHistory };

