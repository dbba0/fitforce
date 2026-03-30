const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/fitforce',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  clientUrl: process.env.CLIENT_URL || '*',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || ''
};
