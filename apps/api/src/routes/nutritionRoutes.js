const express = require('express');
const {
  addNutritionLog,
  addHydrationLog,
  getNutritionSummary
} = require('../controllers/nutritionController');
const { authRequired } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { nutritionSchema, hydrationSchema } = require('../services/validators');

const router = express.Router();

router.get('/summary', authRequired, getNutritionSummary);
router.post('/log', authRequired, validate(nutritionSchema), addNutritionLog);
router.post('/hydration', authRequired, validate(hydrationSchema), addHydrationLog);

module.exports = router;
