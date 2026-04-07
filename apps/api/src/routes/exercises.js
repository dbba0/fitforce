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
router.get('/', async (req, res) => {
  try {
    const qs = pickQueryParams(req.query, ALLOWED_EXERCISE_PARAMS);
    const ymoveResponse = await getExercises(qs);

    const rawItems = Array.isArray(ymoveResponse)
      ? ymoveResponse
      : (ymoveResponse.data ?? ymoveResponse.exercises ?? ymoveResponse.items ?? []);

    const exercises = rawItems.map(ex => ({
      ...ex,
      name: ex.title ?? ex.name ?? '',
      id: ex.id ?? ex.slug ?? '',
      thumbnailUrl: ex.thumbnailUrl ?? null,
      videoUrl: ex.videoUrl ?? null,
    }));

    return res.json({ exercises, pagination: ymoveResponse.pagination ?? null });
  } catch (error) {
    console.error('[Exercises] Failed to fetch exercises', error);
    return res.status(500).json({ message: 'Failed to fetch exercises' });
  }
});

// GET /api/exercises/muscle-groups
router.get('/muscle-groups', async (_req, res) => {
  try {
    const data = await getMuscleGroups();
    return res.json(data);
  } catch (error) {
    console.error('[Exercises] Failed to fetch muscle groups', error);
    return res.status(500).json({ message: 'Failed to fetch muscle groups' });
  }
});

// GET /api/exercises/types
router.get('/types', async (_req, res) => {
  try {
    const data = await getExerciseTypes();
    return res.json(data);
  } catch (error) {
    console.error('[Exercises] Failed to fetch exercise types', error);
    return res.status(500).json({ message: 'Failed to fetch exercise types' });
  }
});

// GET /api/exercises/workout/generate
router.get('/workout/generate', async (req, res) => {
  try {
    const qs = pickQueryParams(req.query, ALLOWED_WORKOUT_PARAMS);
    const ymoveResponse = await generateWorkout(qs);

    const workout = ymoveResponse.data ?? ymoveResponse;
    if (workout.exercises) {
      workout.exercises = workout.exercises.map(item => ({
        ...item,
        exercise: item.exercise ? {
          ...item.exercise,
          name: item.exercise.title ?? item.exercise.name ?? '',
          id: item.exercise.id ?? item.exercise.slug ?? '',
        } : item.exercise,
      }));
    }

    return res.json({ data: workout });
  } catch (error) {
    console.error('[Exercises] Failed to generate workout', error);
    return res.status(500).json({ message: 'Failed to generate workout' });
  }
});

// GET /api/exercises/:id  (no cache — videoUrl expires after 48h)
router.get('/:id', authRequired, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ message: 'Exercise id is required' });
    }
    const data = await getExerciseById(id);
    return res.json(data);
  } catch (error) {
    console.error(`[Exercises] Failed to fetch exercise id=${req.params.id}`, error);
    return res.status(500).json({ message: 'Failed to fetch exercise' });
  }
});

module.exports = router;
