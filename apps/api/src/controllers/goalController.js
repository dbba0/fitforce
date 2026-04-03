const Goal = require('../models/Goal');
const Session = require('../models/Session');

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function calculateStreakDays(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return 0;

  const uniqueDays = Array.from(new Set(sessions.map((session) => startOfDay(session.date).getTime()))).sort(
    (a, b) => b - a
  );

  if (uniqueDays.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    if (uniqueDays[i - 1] - uniqueDays[i] === ONE_DAY_MS) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

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
  const weekStart = startOfDay(now);
  weekStart.setDate(now.getDate() - 7);

  const [weeklySessions, allCompletedSessions] = await Promise.all([
    Session.find({
      user: req.user._id,
      completed: { $ne: false },
      date: { $gte: weekStart }
    }).sort({ date: -1 }),
    Session.find({
      user: req.user._id,
      completed: { $ne: false }
    })
      .select('date')
      .sort({ date: -1 })
  ]);

  const sessionsDone = weeklySessions.length;
  const caloriesDone = weeklySessions.reduce((acc, session) => acc + (session.calories || 0), 0);
  const weeklyVolumeMinutes = weeklySessions.reduce((acc, session) => acc + (session.durationMin || 0), 0);
  const streakDays = calculateStreakDays(allCompletedSessions);

  const sessionsTarget = Math.max(1, Number(goal.sessionsPerWeek) || 1);
  const caloriesTarget = Math.max(1, Number(goal.weeklyCaloriesTarget) || 1);

  return res.json({
    streak: { days: streakDays },
    weeklyVolume: { minutes: weeklyVolumeMinutes },
    progress: {
      sessions: {
        done: sessionsDone,
        target: sessionsTarget,
        percent: Math.min(100, Math.round((sessionsDone / sessionsTarget) * 100))
      },
      calories: {
        done: caloriesDone,
        target: caloriesTarget,
        percent: Math.min(100, Math.round((caloriesDone / caloriesTarget) * 100))
      }
    }
  });
}

module.exports = { getGoal, upsertGoal, progress };
