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

function extractBestLift(session) {
  // Session is now the source of truth; keep backward-compatible best-lift derivation if data exists.
  const directCandidates = [
    session?.bestLift,
    session?.bestLiftKg,
    session?.maxLoadKg
  ];

  const directBest = directCandidates.reduce((best, value) => Math.max(best, Number(value) || 0), 0);
  if (directBest > 0) return directBest;

  const setCandidates = Array.isArray(session?.sets) ? session.sets : [];
  return setCandidates.reduce((best, set) => Math.max(best, Number(set?.loadKg) || 0), 0);
}

async function getDashboard(req, res) {
  const now = new Date();
  const thisWeekStart = startOfDay(now);
  thisWeekStart.setDate(now.getDate() - 7);

  const prevWeekStart = new Date(thisWeekStart);
  prevWeekStart.setDate(thisWeekStart.getDate() - 7);

  const baseFilter = {
    user: req.user._id,
    completed: { $ne: false }
  };

  const [all, thisWeek, prevWeek] = await Promise.all([
    Session.find(baseFilter).sort({ date: -1 }),
    Session.find({ ...baseFilter, date: { $gte: thisWeekStart } }),
    Session.find({
      ...baseFilter,
      date: { $gte: prevWeekStart, $lt: thisWeekStart }
    })
  ]);

  const totalSessions = all.length;
  const totalMinutes = all.reduce((acc, session) => acc + (session.durationMin || 0), 0);
  const totalCalories = all.reduce((acc, session) => acc + (session.calories || 0), 0);
  const bestLift = all.reduce((best, session) => Math.max(best, extractBestLift(session)), 0);

  const weekCalories = thisWeek.reduce((acc, session) => acc + (session.calories || 0), 0);
  const prevWeekCalories = prevWeek.reduce((acc, session) => acc + (session.calories || 0), 0);
  const weeklyDelta = weekCalories - prevWeekCalories;

  const weeklyGraph = Array.from({ length: 7 }).map((_, i) => {
    const day = startOfDay(now);
    day.setDate(now.getDate() - (6 - i));
    const label = day.toLocaleDateString('fr-CA', { weekday: 'short' });
    const dayKey = day.toDateString();
    const sessions = thisWeek.filter((session) => new Date(session.date).toDateString() === dayKey);
    const calories = sessions.reduce((acc, session) => acc + (session.calories || 0), 0);
    return { label, calories, sessions: sessions.length };
  });

  return res.json({
    summary: {
      totalSessions,
      totalMinutes,
      totalCalories,
      bestLift,
      bestPerformance: bestLift,
      weeklyDelta,
      weekOverWeekCaloriesDelta: weeklyDelta
    },
    weeklyGraph,
    streakDays: calculateStreakDays(all)
  });
}

module.exports = { getDashboard };
