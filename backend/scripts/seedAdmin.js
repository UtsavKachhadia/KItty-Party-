import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import env from '../config/env.js';
import db from '../config/db.js';

const ADMIN_EMAIL = 'admin@system.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_USERNAME = 'antigravity-admin';

async function seedAdmin() {
  try {
    // 1. Connect to Database (using existing db.js)
    await db; 

    // 2. Check for existing admin
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin already exists: ${existing.username} (${existing.email})`);
      process.exit(0);
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    // 4. Create admin user
    const admin = await User.create({
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      connectors: {
        github: { token: '', isConnected: false },
        slack: { token: '', isConnected: false },
        jira: { apiKey: '', domain: '', isConnected: false },
      },
    });

    console.log(`Admin user seeded successfully: ${admin.username} (${admin.email})`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
