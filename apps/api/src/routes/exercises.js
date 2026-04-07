const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getExercises, getExerciseById, getMuscleGroups, getExerciseTypes, generateWorkout } = require('../services/ymoveService');

const router = express.Router();

const ALLOWED_EXERCISE_PARAMS = ['muscleGroup', 'exerciseType', 'difficulty', 'hasVideo', 'limit', 'page'];
const ALLOWED_WORKOUT_PARAMS = ['muscleGroup', 'difficulty'];

function pickQueryParams(query, allowed) {
  const params = new URLSearchParams();
  for (const key of allowed) {
    const value = query[key];
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

// GET /api/exercises
router.get('/', authRequired, async (req, res) => {
  try {
    const qs = pickQueryParams(req.query, ALLOWED_EXERCISE_PARAMS);
    const data = await getExercises(qs);
    return res.json(data);
  } catch (error) {
    console.error('[Exercises] Failed to fetch exercises', error);
    return res.status(500).json({ message: 'Failed to fetch exercises' });
  }
});

// GET /api/exercises/muscle-groups
router.get('/muscle-groups', authRequired, async (_req, res) => {
  try {
    const ymoveResponse = await getMuscleGroups();
    const raw = ymoveResponse.data
      ?? ymoveResponse.muscleGroups
      ?? ymoveResponse.items
      ?? (Array.isArray(ymoveResponse) ? ymoveResponse : []);

    const groups = raw
      .map((item) => (typeof item === 'string' ? item : (item.slug ?? item.name ?? '')))
      .filter(Boolean);

    return res.json({ muscleGroups: groups });
  } catch (error) {
    console.error('[Exercises] Failed to fetch muscle groups', error);
    return res.status(500).json({ message: 'Failed to fetch muscle groups' });
  }
});

// GET /api/exercises/types
router.get('/types', authRequired, async (_req, res) => {
  try {
    const data = await getExerciseTypes();
    return res.json(data);
  } catch (error) {
    console.error('[Exercises] Failed to fetch exercise types', error);
    return res.status(500).json({ message: 'Failed to fetch exercise types' });
  }
});

// GET /api/exercises/workout/generate
router.get('/workout/generate', authRequired, async (req, res) => {
  try {
    const qs = pickQueryParams(req.query, ALLOWED_WORKOUT_PARAMS);
    const data = await generateWorkout(qs);
    return res.json(data);
  } catch (error) {
    console.error('[Exercises] Failed to generate workout', error);
    return res.status(500).json({ message: 'Failed to generate workout' });
  }
});

// GET /api/exercises/:id  (no cache — videoUrl expires after 48h)
router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ message: 'ID requis' });
    }
    res.set('Cache-Control', 'no-store');
    const response = await getExerciseById(id);
    return res.json(response);
  } catch (error) {
    console.error('[Exercises] detail failed:', error.message);
    if (error.message?.includes('404')) {
      return res.status(404).json({ message: 'Exercice non trouvé' });
    }
    return res.status(502).json({ message: 'Impossible de charger cet exercice' });
  }
});

module.exports = router;
