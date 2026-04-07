const { ymoveApiKey } = require('../config/env');

const YMOVE_BASE = 'https://exercise-api.ymove.app/api/v2';
const YMOVE_KEY = ymoveApiKey;

const ymoveFetch = async (path) => {
  const res = await fetch(`${YMOVE_BASE}${path}`, {
    headers: { 'X-API-Key': YMOVE_KEY }
  });
  if (!res.ok) throw new Error(`yMove ${res.status}`);
  return res.json();
};

module.exports = {
  getExercises: (params) => ymoveFetch(`/exercises?${params}`),
  getExerciseById: (id) => ymoveFetch(`/exercises/${id}`),
  getMuscleGroups: () => ymoveFetch('/exercises/muscle-groups'),
  getExerciseTypes: () => ymoveFetch('/exercises/exercise-types'),
  generateWorkout: (params) => ymoveFetch(`/workouts/generate?${params}`),
};
