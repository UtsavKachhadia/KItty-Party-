import mongoose from 'mongoose';
import env from './env.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.warn('⚠️ Atlas connection failed! Spinning up local in-memory MongoDB fallback...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, { maxPoolSize: 10 });
        console.log('✅ MongoDB connected (IN-MEMORY FALLBACK)');
        return;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export default connectDB;
