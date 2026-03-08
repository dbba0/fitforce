const Program = require('../models/Program');

async function listPrograms(req, res) {
  const { mode, level } = req.query;
  const query = {};
  if (mode) query.mode = mode;
  if (level) query.level = level;

  const programs = await Program.find(query)
    .populate({
      path: 'sessions.exercises.exercise',
      select: 'name equipment mode videoUrl category'
    })
    .sort({ createdAt: -1 });

  return res.json({ programs });
}

async function getProgramById(req, res) {
  const program = await Program.findById(req.params.id).populate({
    path: 'sessions.exercises.exercise',
    select: 'name equipment mode videoUrl category description muscleGroups'
  });

  if (!program) return res.status(404).json({ message: 'Program not found' });
  return res.json({ program });
}

module.exports = { listPrograms, getProgramById };
