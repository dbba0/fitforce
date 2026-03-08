const User = require('../models/User');
const Goal = require('../models/Goal');
const { signToken, hashPassword, verifyPassword } = require('../utils/auth');

async function register(req, res) {
  const data = req.validatedBody;
  const exists = await User.findOne({ email: data.email });
  if (exists) return res.status(409).json({ message: 'Email already used' });

  const user = await User.create({
    ...data,
    passwordHash: await hashPassword(data.password)
  });

  await Goal.create({
    user: user._id,
    sessionsPerWeek: 3,
    weeklyCaloriesTarget: 1500,
    targetWeightKg: data.weightKg
  });

  const token = signToken(user);
  return res.status(201).json({ token, user });
}

async function login(req, res) {
  const data = req.validatedBody;
  const user = await User.findOne({ email: data.email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken(user);
  return res.json({ token, user });
}

async function me(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, me };
