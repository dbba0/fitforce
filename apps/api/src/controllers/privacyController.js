const User = require('../models/User');

const DEFAULT_PRIVACY = {
  showProfile: true,
  showGoals: true,
  showAchievements: true,
  showStats: true,
  showPosts: true
};

function normalizePrivacy(input = {}) {
  return {
    showProfile: input.showProfile !== false,
    showGoals: input.showGoals !== false,
    showAchievements: input.showAchievements !== false,
    showStats: input.showStats !== false,
    showPosts: input.showPosts !== false
  };
}

async function getPrivacy(req, res) {
  const user = await User.findById(req.user._id).select('privacy');
  const privacy = normalizePrivacy(user?.privacy || DEFAULT_PRIVACY);
  return res.json({ privacy });
}

async function updatePrivacy(req, res) {
  const next = normalizePrivacy(req.body || {});
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { privacy: next },
    { new: true, runValidators: true }
  ).select('privacy');

  return res.json({ privacy: normalizePrivacy(user?.privacy || next) });
}

module.exports = { getPrivacy, updatePrivacy };

