const Goal = require('../models/Goal');
const WorkoutLog = require('../models/WorkoutLog');

async function getGoal(req, res) {
  const goal = await Goal.findOne({ user: req.user._id });
  if (!goal) return res.status(404).json({ message: 'Goal not found' });
  return res.json({ goal });
}

async function upsertGoal(req, res) {
  const goal = await Goal.findOneAndUpdate(
    { user: req.user._id },
    { ...req.validatedBody, user: req.user._id },
    { upsert: true, new: true }
  );

  return res.json({ goal });
}

async function progress(req, res) {
  const goal = await Goal.findOne({ user: req.user._id });
  if (!goal) return res.status(404).json({ message: 'Goal not found' });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const weeklyWorkouts = await WorkoutLog.find({
    user: req.user._id,
    date: { $gte: weekStart }
  });

  const sessionsDone = weeklyWorkouts.length;
  const caloriesDone = weeklyWorkouts.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);

  return res.json({
    progress: {
      sessions: {
        done: sessionsDone,
        target: goal.sessionsPerWeek,
        percent: Math.min(100, Math.round((sessionsDone / goal.sessionsPerWeek) * 100))
      },
      calories: {
        done: caloriesDone,
        target: goal.weeklyCaloriesTarget,
        percent: Math.min(100, Math.round((caloriesDone / goal.weeklyCaloriesTarget) * 100))
      }
    }
  });
}

module.exports = { getGoal, upsertGoal, progress };
