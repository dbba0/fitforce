const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { mongoUri } = require('./env');

let memoryServer;

async function connectDb() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI est requis en production');
  }

  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected (${mongoUri})`);
  } catch (error) {
    const isConnectionRefused =
      error?.message?.includes('ECONNREFUSED') || error?.name === 'MongooseServerSelectionError';
    const isProduction = process.env.NODE_ENV === 'production';

    if (!isConnectionRefused || isProduction) {
      throw error;
    }

    // eslint-disable-next-line no-console
    console.warn('MongoDB local indisponible, fallback vers MongoMemoryServer (dev only).');
    memoryServer = await MongoMemoryServer.create({
      instance: { dbName: 'fitforce-dev', ip: '127.0.0.1' }
    });
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri, { serverSelectionTimeoutMS: 5000 });
    // eslint-disable-next-line no-console
    console.log(`MongoDB memory connected (${memoryUri})`);
  }
}

async function closeDb() {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = { connectDb, closeDb };
