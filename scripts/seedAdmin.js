/**
 * Seed script — creates the system admin account.
 * Idempotent: safe to run multiple times.
 *
 * Usage: node scripts/seedAdmin.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI or MONGO_URI not set in .env');
  process.exit(1);
}

const ADMIN = {
  username: 'antigravity-admin',
  email:    'admin@system.com',
  password: 'Admin@123',
  role:     'admin',
};

async function seed() {
  try {
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB connected');

    // Get or create User collection with schema
    const userSchema = new mongoose.Schema({
      username:   { type: String, required: true, unique: true },
      email:      { type: String, required: true, unique: true },
      password:   { type: String, required: true },
      role:       { type: String, enum: ['user', 'admin'], default: 'user' },
      connectors: {
        github: { token: String, isConnected: { type: Boolean, default: false } },
        slack:  { token: String, isConnected: { type: Boolean, default: false } },
        jira:   { apiKey: String, domain: String, isConnected: { type: Boolean, default: false } },
      },
      createdAt: { type: Date, default: Date.now },
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN.email });
    if (existing) {
      console.log('ℹ️  Admin already exists');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password and create admin
    const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
    await User.create({
      username: ADMIN.username,
      email:    ADMIN.email,
      password: hashedPassword,
      role:     ADMIN.role,
      connectors: {
        github: { token: '', isConnected: false },
        slack:  { token: '', isConnected: false },
        jira:   { apiKey: '', domain: '', isConnected: false },
      },
    });

    console.log('✅ Admin seeded successfully');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seed();
