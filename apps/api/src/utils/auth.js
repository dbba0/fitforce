const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwtSecret } = require('../config/env');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), email: user.email }, jwtSecret, { expiresIn: '7d' });
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

module.exports = { signToken, hashPassword, verifyPassword };
