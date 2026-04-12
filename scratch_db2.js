import mongoose from 'mongoose';
import Run from './backend/src/models/Run.js';
import env from './backend/config/env.js';

async function diagnose() {
  await mongoose.connect(env.MONGO_URI || env.MONGODB_URI);
  const run = await Run.findOne().sort({ createdAt: -1 }).lean();
  console.log(JSON.stringify(run, null, 2));
  process.exit(0);
}
diagnose();
