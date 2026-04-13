const express = require('express');
const mongoose = require('mongoose');
const { updateProfile } = require('../controllers/userController');
const { authRequired } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');

const router = express.Router();

router.patch('/profile', authRequired, updateProfile);

router.get('/me/stats', authRequired, async (req, res) => {
  const user = await User.findById(req.user._id).select('xp streakDays lastWorkoutDate');
  if (!user) return res.status(404).json({ message: 'User not found' });
  return res.json({
    xp: user.xp ?? 0,
    streakDays: user.streakDays ?? 0,
    lastWorkoutDate: user.lastWorkoutDate ?? null
  });
});

router.post('/:id/follow', authRequired, async (req, res) => {
  const targetId = String(req.params.id || '').trim();
  const meId = req.user._id.toString();

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (targetId === meId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  const [me, target] = await Promise.all([
    User.findById(req.user._id).select('following'),
    User.findById(targetId).select('followers')
  ]);

  if (!me || !target) {
    return res.status(404).json({ message: 'User not found' });
  }

  const isFollowing = (me.following || []).some((item) => item.toString() === targetId);

  if (isFollowing) {
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $pull: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $pull: { followers: req.user._id } })
    ]);
  } else {
    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $addToSet: { following: target._id } }),
      User.updateOne({ _id: target._id }, { $addToSet: { followers: req.user._id } })
    ]);
  }

  const refreshedTarget = await User.findById(target._id).select('followers following');

  return res.json({
    following: !isFollowing,
    followersCount: refreshedTarget?.followers?.length || 0,
    followingCount: refreshedTarget?.following?.length || 0
  });
});

router.get('/:id/profile', async (req, res) => {
  const userId = String(req.params.id || '').trim();
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  const profileUser = await User.findById(userId).select(
    'fullName bio level goalType privacy followers following'
  );
  if (!profileUser) return res.status(404).json({ message: 'User not found' });

  const privacy = profileUser.privacy || {};
  const isPrivate = privacy.showProfile === false;

  const profile = {
    id: profileUser._id.toString(),
    displayName: profileUser.fullName || 'Athlete',
    level: profileUser.level || 'debutant',
    objective: profileUser.goalType || 'recomposition',
    bio: profileUser.bio || '',
    isPrivate,
    followersCount: (profileUser.followers || []).length,
    followingCount: (profileUser.following || []).length
  };

  if (isPrivate) {
    return res.json({ profile });
  }

  const sessions = await Session.find({
    user: profileUser._id,
    completed: { $ne: false }
  }).select('durationMin durationSeconds distanceMeters distanceKm');

  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, session) => {
    if (typeof session.durationMin === 'number') return sum + session.durationMin;
    if (typeof session.durationSeconds === 'number') return sum + session.durationSeconds / 60;
    return sum;
  }, 0);
  const kmTotal = sessions.reduce((sum, session) => {
    if (typeof session.distanceMeters === 'number') return sum + session.distanceMeters / 1000;
    if (typeof session.distanceKm === 'number') return sum + session.distanceKm;
    return sum;
  }, 0);

  profile.stats = {
    totalSessions,
    kmTotal: Number(kmTotal.toFixed(2)),
    totalTimeSeconds: Math.round(totalMinutes * 60),
    totalMinutes: Math.round(totalMinutes)
  };

  return res.json({ profile });
});

module.exports = router;
