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
      console.error(
        `❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`
      );
      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to connect to MongoDB after maximum retries');
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export default connectDB;
