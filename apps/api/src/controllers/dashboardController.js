const WorkoutLog = require('../models/WorkoutLog');

async function getDashboard(req, res) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);

  const prevWeekStart = new Date(now);
  prevWeekStart.setDate(now.getDate() - 14);

  const [all, thisWeek, prevWeek] = await Promise.all([
    WorkoutLog.find({ user: req.user._id }),
    WorkoutLog.find({ user: req.user._id, date: { $gte: thisWeekStart } }),
    WorkoutLog.find({
      user: req.user._id,
      date: { $gte: prevWeekStart, $lt: thisWeekStart }
    })
  ]);

  const totalSessions = all.length;
  const totalMinutes = all.reduce((acc, w) => acc + (w.durationMin || 0), 0);
  const totalCalories = all.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
  const bestPerformance = all.reduce((best, w) => {
    const maxLoadInWorkout = (w.exercises || []).reduce((b, ex) => {
      const maxSetLoad = (ex.sets || []).reduce((s, set) => Math.max(s, set.loadKg || 0), 0);
      return Math.max(b, maxSetLoad);
    }, 0);
    return Math.max(best, maxLoadInWorkout);
  }, 0);

  const weekCalories = thisWeek.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
  const prevWeekCalories = prevWeek.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);

  const weeklyGraph = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date();
    day.setDate(now.getDate() - (6 - i));
    const label = day.toLocaleDateString('fr-CA', { weekday: 'short' });
    const dayKey = day.toDateString();
    const sessions = thisWeek.filter((w) => new Date(w.date).toDateString() === dayKey);
    const calories = sessions.reduce((acc, w) => acc + (w.caloriesBurned || 0), 0);
    return { label, calories, sessions: sessions.length };
  });

  return res.json({
    summary: {
      totalSessions,
      totalMinutes,
      totalCalories,
      bestPerformance,
      weekOverWeekCaloriesDelta: weekCalories - prevWeekCalories
    },
    weeklyGraph,
    streakDays: req.user.streakDays
  });
}

module.exports = { getDashboard };
