const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  age: z.number().int().min(13).max(99).optional(),
  weightKg: z.number().min(30).max(300).optional(),
  heightCm: z.number().min(120).max(230).optional(),
  level: z.enum(['debutant', 'intermediaire', 'avance']).optional(),
  goalType: z.enum(['prise_de_masse', 'perte_de_poids', 'endurance', 'recomposition']).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

const workoutSchema = z.object({
  mode: z.enum(['home', 'gym']),
  program: z.string().optional(),
  date: z.string().datetime().optional(),
  durationMin: z.number().min(5).max(300),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  exercises: z
    .array(
      z.object({
        exercise: z.string(),
        sets: z.array(
          z.object({
            reps: z.number().min(0).max(200).optional(),
            loadKg: z.number().min(0).max(500).optional(),
            durationSec: z.number().min(0).max(7200).optional()
          })
        )
      })
    )
    .default([]),
  notes: z.string().max(1000).optional()
});

const goalSchema = z.object({
  targetWeightKg: z.number().min(30).max(300).optional(),
  sessionsPerWeek: z.number().int().min(1).max(14),
  weeklyCaloriesTarget: z.number().int().min(100).max(20000),
  targetWaistCm: z.number().min(30).max(200).optional()
});

const nutritionSchema = z.object({
  calories: z.number().int().min(1).max(10000),
  proteinG: z.number().min(0).max(500).optional(),
  carbsG: z.number().min(0).max(1000).optional(),
  fatsG: z.number().min(0).max(500).optional(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  note: z.string().max(500).optional()
});

const hydrationSchema = z.object({
  ml: z.number().int().min(50).max(10000)
});

module.exports = {
  registerSchema,
  loginSchema,
  workoutSchema,
  goalSchema,
  nutritionSchema,
  hydrationSchema
};
