const express = require('express');
const { createWorkout, listWorkouts } = require('../controllers/workoutController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { workoutSchema } = require('../services/validators');

const router = express.Router();

router.post('/', authRequired, validate(workoutSchema), createWorkout);
router.get('/', authRequired, listWorkouts);

module.exports = router;
