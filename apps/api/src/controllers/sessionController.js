const Session = require('../models/Session');

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

  const session = await Session.create({
    user: req.user._id,
    programId: String(body.programId),
    clientId,
    date: body.date ? new Date(body.date) : new Date(),
    durationMin: Number(body.durationMin),
    calories: Number(body.calories || 0),
    completed: body.completed !== false,
    type: body.type === 'cardio' ? 'cardio' : 'strength'
  });

  return res.status(201).json({ session: toClientSession(session) });
}

module.exports = { listSessions, createSession };
