const Session = require('../models/Session');
const User = require('../models/User');

// XP awarded per completed session: 50 base + 1 per minute of duration
function computeXp(durationMin) {
  return 50 + Math.max(0, Math.round(Number(durationMin) || 0));
}

// Compare two dates by calendar day (UTC)
function isSameDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function isYesterday(last, today) {
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  return isSameDay(last, yesterday);
}

async function updateStreakAndXp(userId, durationMin, sessionDate) {
  const user = await User.findById(userId).select('xp streakDays lastWorkoutDate');
  if (!user) return;

  const today = new Date(sessionDate);
  today.setUTCHours(0, 0, 0, 0);

  const last = user.lastWorkoutDate ? new Date(user.lastWorkoutDate) : null;

  // Same day: XP only, streak unchanged
  if (last && isSameDay(last, today)) {
    await User.updateOne({ _id: userId }, { $inc: { xp: computeXp(durationMin) } });
    return;
  }

  const newStreak = last && isYesterday(last, today) ? user.streakDays + 1 : 1;
  await User.updateOne(
    { _id: userId },
    {
      $inc: { xp: computeXp(durationMin) },
      $set: { streakDays: newStreak, lastWorkoutDate: today }
    }
  );
}

function toClientSession(session) {
  return {
    id: session._id.toString(),
    clientId: session.clientId || null,
    programId: session.programId,
    date: session.date?.toISOString?.() || new Date(session.date).toISOString(),
    durationMin: session.durationMin,
    calories: session.calories ?? 0,
    completed: session.completed ?? true,
    type: session.type || 'strength'
  };
}

async function listSessions(req, res) {
  const sessions = await Session.find({ user: req.user._id }).sort({ date: -1 }).limit(500);
  return res.json({ sessions: sessions.map(toClientSession) });
}

async function createSession(req, res) {
  const body = req.body || {};
  if (!body.programId || !body.durationMin) {
    return res.status(400).json({ message: 'programId and durationMin are required' });
  }

  const clientId = body.clientId ? String(body.clientId) : null;
  if (clientId) {
    const existing = await Session.findOne({ user: req.user._id, clientId });
    if (existing) {
      return res.status(200).json({ session: toClientSession(existing) });
    }
  }

  const completed = body.completed !== false;
  const sessionDate = body.date ? new Date(body.date) : new Date();

  const session = await Session.create({
    user: req.user._id,
    programId: String(body.programId),
    clientId,
    date: sessionDate,
    durationMin: Number(body.durationMin),
    calories: Number(body.calories || 0),
    completed,
    type: body.type === 'cardio' ? 'cardio' : 'strength'
  });

  if (completed) {
    await updateStreakAndXp(req.user._id, body.durationMin, sessionDate);
  }

  return res.status(201).json({ session: toClientSession(session) });
}

module.exports = { listSessions, createSession };
