const express = require('express');
const { rapidApiKey, rapidApiHost } = require('../config/env');

const router = express.Router();

const EXERCISE_DB_URL = `https://${rapidApiHost}/exercises`;
const CACHE_TTL_MS = 1000 * 60 * 15;
let cache = {
  expiresAt: 0,
  exercises: null,
};

function sanitizeExercise(item) {
  return {
    id: String(item?.id ?? ''),
    name: String(item?.name ?? ''),
    target: String(item?.target ?? ''),
    bodyPart: String(item?.bodyPart ?? ''),
    gifUrl: String(item?.gifUrl ?? ''),
  };
}

router.get('/', async (req, res) => {
  if (cache.exercises && Date.now() < cache.expiresAt) {
    return res.json({ exercises: cache.exercises });
  }

  if (!rapidApiKey) {
    return res.status(500).json({
      message: 'RAPIDAPI_KEY is missing on server',
    });
  }

  try {
    const response = await fetch(EXERCISE_DB_URL, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': rapidApiHost,
      },
    });

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        message: 'Failed to fetch exercises from RapidAPI',
        details: details.slice(0, 400),
      });
    }

    const payload = await response.json();
    const rawExercises = Array.isArray(payload) ? payload : [];
    const exercises = rawExercises
      .map(sanitizeExercise)
      .filter((exercise) => exercise.id && exercise.name);

    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      exercises,
    };

    return res.json({ exercises });
  } catch (error) {
    console.error('[Exercises API] RapidAPI fetch failed', error);
    return res.status(502).json({
      message: 'Unable to reach ExerciseDB provider',
    });
  }
});

module.exports = router;
