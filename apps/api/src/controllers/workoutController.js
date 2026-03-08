const WorkoutLog = require('../models/WorkoutLog');
const User = require('../models/User');

function isYesterday(d1, d2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const t1 = new Date(d1).setHours(0, 0, 0, 0);
  const t2 = new Date(d2).setHours(0, 0, 0, 0);
  return Math.round((t2 - t1) / oneDay) === 1;
}

async function createWorkout(req, res) {
  const data = req.validatedBody;
  const workout = await WorkoutLog.create({
    ...data,
    date: data.date ? new Date(data.date) : new Date(),
    user: req.user._id
  });

  const user = await User.findById(req.user._id);
  const now = workout.date;

  if (!user.lastWorkoutDate) {
    user.streakDays = 1;
  } else if (isYesterday(user.lastWorkoutDate, now)) {
    user.streakDays += 1;
  } else if (new Date(user.lastWorkoutDate).toDateString() !== now.toDateString()) {
    user.streakDays = 1;
  }

  user.lastWorkoutDate = now;
  await user.save();

  return res.status(201).json({ workout, streakDays: user.streakDays });
}

async function listWorkouts(req, res) {
  const workouts = await WorkoutLog.find({ user: req.user._id })
    .populate('program', 'title mode')
    .populate('exercises.exercise', 'name category')
    .sort({ date: -1 })
    .limit(100);

  return res.json({ workouts });
}

module.exports = { createWorkout, listWorkouts };
