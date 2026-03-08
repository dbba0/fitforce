const User = require('../models/User');
const Goal = require('../models/Goal');
const Session = require('../models/Session');
const Post = require('../models/Post');

async function updateProfile(req, res) {
  const allowed = [
    'fullName',
    'bio',
    'avatarUrl',
    'age',
    'weightKg',
    'heightCm',
    'level',
    'goalType'
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  return res.json({ user });
}

async function getPublicProfile(req, res) {
  const profileUser = await User.findById(req.params.id).select(
    'fullName bio level goalType privacy'
  );
  if (!profileUser) return res.status(404).json({ message: 'User not found' });

  const isOwn = profileUser._id.toString() === req.user._id.toString();
  const privacy = profileUser.privacy || {};
  const isPrivate = !isOwn && privacy.showProfile === false;

  const profile = {
    id: profileUser._id.toString(),
    displayName: profileUser.fullName || 'Athlete',
    level: profileUser.level || 'debutant',
    objective: profileUser.goalType || 'recomposition',
    bio: profileUser.bio || '',
    isPrivate
  };

  if (isPrivate) return res.json({ profile });

  if (isOwn || privacy.showStats !== false) {
    const sessions = await Session.find({ user: profileUser._id }).select('durationMin calories');
    profile.stats = {
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((sum, s) => sum + (s.durationMin || 0), 0),
      totalCalories: sessions.reduce((sum, s) => sum + (s.calories || 0), 0)
    };
  }

  if (isOwn || privacy.showGoals !== false) {
    const goal = await Goal.findOne({ user: profileUser._id });
    if (goal) {
      profile.goals = [
        {
          id: 'goal_weight',
          title: 'Poids cible',
          current: 0,
          target: goal.targetWeightKg || 0,
          unit: 'kg'
        },
        {
          id: 'goal_sessions',
          title: 'Seances / semaine',
          current: 0,
          target: goal.sessionsPerWeek || 0,
          unit: '/ week'
        },
        {
          id: 'goal_calories',
          title: 'Calories / semaine',
          current: 0,
          target: goal.weeklyCaloriesTarget || 0,
          unit: 'kcal'
        }
      ];
    } else {
      profile.goals = [];
    }
  }

  if (isOwn || privacy.showPosts !== false) {
    const posts = await Post.find({ user: profileUser._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('content likes createdAt type');
    profile.posts = posts.map((p) => ({
      id: p._id.toString(),
      type: p.type || 'update',
      content: p.content || '',
      likeCount: (p.likes || []).length,
      createdAt: p.createdAt
    }));
  }

  return res.json({ profile });
}

module.exports = { updateProfile, getPublicProfile };
