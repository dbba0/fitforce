const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET est requis en production');
}

if (isProduction && !process.env.YMOVE_API_KEY) {
  throw new Error('YMOVE_API_KEY est requis en production');
}

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/fitforce',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  clientUrl: process.env.CLIENT_URL || '*',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  rapidApiHost: process.env.RAPIDAPI_HOST || 'exercisedb.p.rapidapi.com',
  ymoveApiKey: process.env.YMOVE_API_KEY || '',
};
