const express = require('express');

const router = express.Router();

const EXERCISEDB_BASE_URL = (process.env.EXERCISEDB_BASE_URL || 'https://exercisedb.dev').replace(
  /\/+$/,
  ''
);
const EXERCISE_DB_LIST_URL = `${EXERCISEDB_BASE_URL}/api/v2/exercises`;
const LIST_CACHE_TTL_MS = 1000 * 60 * 15;
const DETAIL_CACHE_TTL_MS = 1000 * 60 * 30;

let listCache = {
  expiresAt: 0,
  exercises: null,
};
const exerciseByIdCache = new Map();

function sanitizeExercise(item) {
  return {
    id: String(item?.id ?? ''),
    name: String(item?.name ?? ''),
    target: String(item?.target ?? ''),
    bodyPart: String(item?.bodyPart ?? ''),
    gifUrl: String(item?.gifUrl ?? ''),
  };
}

function sanitizeExerciseDetail(item) {
  return {
    id: String(item?.id ?? ''),
    name: String(item?.name ?? ''),
    bodyPart: String(item?.bodyPart ?? ''),
    target: String(item?.target ?? ''),
    gifUrl: String(item?.gifUrl ?? ''),
    secondaryMuscles: Array.isArray(item?.secondaryMuscles)
      ? item.secondaryMuscles.map((muscle) => String(muscle ?? '')).filter(Boolean)
      : [],
    instructions: Array.isArray(item?.instructions)
      ? item.instructions.map((instruction) => String(instruction ?? '')).filter(Boolean)
      : [],
  };
}

function getCachedExerciseById(id) {
  const entry = exerciseByIdCache.get(id);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    exerciseByIdCache.delete(id);
    return null;
  }

  return entry.exercise;
}

function setCachedExerciseById(id, exercise) {
  exerciseByIdCache.set(id, {
    expiresAt: Date.now() + DETAIL_CACHE_TTL_MS,
    exercise,
  });
}

router.get('/', async (req, res) => {
  if (listCache.exercises && Date.now() < listCache.expiresAt) {
    return res.json({ exercises: listCache.exercises });
  }

  try {
    const response = await fetch(EXERCISE_DB_LIST_URL, { method: 'GET' });

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        message: 'Failed to fetch exercises from ExerciseDB provider',
        details: details.slice(0, 400),
      });
    }

    const payload = await response.json();
    const rawExercises = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.exercises)
      ? payload.exercises
      : [];
    const exercises = rawExercises
      .map(sanitizeExercise)
      .filter((exercise) => exercise.id && exercise.name);

    listCache = {
      expiresAt: Date.now() + LIST_CACHE_TTL_MS,
      exercises,
    };

    return res.json({ exercises });
  } catch (error) {
    console.error('[Exercises API] list fetch failed', error);
    return res.status(502).json({
      message: 'Unable to reach ExerciseDB provider',
    });
  }
});

router.get('/:id', async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) {
    return res.status(400).json({ message: 'Exercise id is required' });
  }

  const cachedExercise = getCachedExerciseById(id);
  if (cachedExercise) {
    return res.json(cachedExercise);
  }

  try {
    const response = await fetch(
      `${EXERCISEDB_BASE_URL}/api/v2/exercises/exercise/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        message: 'Failed to fetch exercise details from ExerciseDB provider',
        details: details.slice(0, 400),
      });
    }

    const payload = await response.json();
    const candidate =
      payload && typeof payload === 'object' && payload.exercise ? payload.exercise : payload;
    const exercise = sanitizeExerciseDetail(candidate);

    if (!exercise.id || !exercise.name) {
      return res.status(502).json({
        message: 'ExerciseDB provider returned invalid exercise payload',
      });
    }

    setCachedExerciseById(id, exercise);
    return res.json(exercise);
  } catch (error) {
    console.error(`[Exercises API] details fetch failed for id=${id}`, error);
    return res.status(502).json({
      message: 'Unable to reach ExerciseDB provider',
    });
  }
});

module.exports = router;
