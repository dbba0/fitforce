const express = require('express');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const { ymoveApiKey } = require('../config/env');

const YMOVE_BASE = 'https://exercise-api.ymove.app/api/v2';
const YMOVE_KEY = ymoveApiKey;

async function ymoveFetch(path) {
  const res = await fetch(`${YMOVE_BASE}${path}`, {
    headers: { 'X-API-Key': YMOVE_KEY },
  });
  if (!res.ok) throw new Error(`yMove ${res.status}`);
  return res.json();
}

// GET /api/nutrition-ymove/foods/search?q=...
router.get('/foods/search', authRequired, async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ foods: [] });
    const data = await ymoveFetch(`/foods?q=${encodeURIComponent(q)}`);
    return res.json(data);
  } catch (err) {
    console.error('[NutritionYmove] search failed:', err.message);
    return res.status(502).json({ message: 'Erreur recherche aliments' });
  }
});

// GET /api/nutrition-ymove/foods/:id
router.get('/foods/:id', authRequired, async (req, res) => {
  try {
    const data = await ymoveFetch(`/foods/${req.params.id}`);
    return res.json(data);
  } catch (err) {
    console.error('[NutritionYmove] food detail failed:', err.message);
    if (err.message?.includes('404')) {
      return res.status(404).json({ message: 'Aliment introuvable' });
    }
    return res.status(502).json({ message: 'Impossible de charger cet aliment' });
  }
});

// GET /api/nutrition-ymove/mealplan/generate?calories=2000&diet=balanced
router.get('/mealplan/generate', authRequired, async (req, res) => {
  try {
    const calories = Number(req.query.calories) || 2000;
    const diet = String(req.query.diet || 'balanced');
    const data = await ymoveFetch(
      `/mealplans/generate?calories=${calories}&diet=${encodeURIComponent(diet)}`
    );
    return res.json(data);
  } catch (err) {
    console.error('[NutritionYmove] mealplan failed:', err.message);
    return res.status(502).json({ message: 'Erreur génération meal plan' });
  }
});

module.exports = router;
