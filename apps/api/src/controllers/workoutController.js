const Session = require('../models/Session');
const User = require('../models/User');

function isYesterday(d1, d2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const t1 = new Date(d1).setHours(0, 0, 0, 0);
  const t2 = new Date(d2).setHours(0, 0, 0, 0);
  return Math.round((t2 - t1) / oneDay) === 1;
}

function inferSessionType(mode) {
  if (mode === 'cardio') return 'cardio';
  return 'strength';
}

function inferProgramId(data) {
  if (data.program) return String(data.program);
  return data.mode === 'home' ? 'legacy_home_program' : 'legacy_gym_program';
}

function toLegacyWorkoutResponse(session, source) {
  return {
    _id: session._id,
    id: session._id?.toString?.() || String(session._id),
    user: session.user,
    mode: source.mode || (String(session.programId || '').includes('home') ? 'home' : 'gym'),
    program: source.program || session.programId || null,
    date: session.date,
    durationMin: session.durationMin,
    caloriesBurned: session.calories || 0,
    exercises: Array.isArray(source.exercises) ? source.exercises : [],
    notes: source.notes || '',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

async function createWorkout(req, res) {
  const data = req.validatedBody;
  const now = data.date ? new Date(data.date) : new Date();

  const session = await Session.create({
    user: req.user._id,
    programId: inferProgramId(data),
    date: now,
    durationMin: Number(data.durationMin),
    calories: Number(data.caloriesBurned || 0),
    completed: true,
    type: inferSessionType(data.mode)
  });

  const user = await User.findById(req.user._id);
  if (user) {
    if (!user.lastWorkoutDate) {
      user.streakDays = 1;
    } else if (isYesterday(user.lastWorkoutDate, now)) {
      user.streakDays += 1;
    } else if (new Date(user.lastWorkoutDate).toDateString() !== now.toDateString()) {
      user.streakDays = 1;
    }

    user.lastWorkoutDate = now;
    await user.save();
  }

  return res.status(201).json({
    workout: toLegacyWorkoutResponse(session, data),
    streakDays: user?.streakDays || 0
  });
}

async function listWorkouts(req, res) {
  const sessions = await Session.find({ user: req.user._id, completed: { $ne: false } })
    .sort({ date: -1 })
    .limit(100);

  const workouts = sessions.map((session) =>
    toLegacyWorkoutResponse(session, {
      mode: session.type === 'cardio' ? 'home' : 'gym',
      program: session.programId,
      exercises: [],
      notes: ''
    })
  );

  return res.json({ workouts });
}

module.exports = { createWorkout, listWorkouts };
