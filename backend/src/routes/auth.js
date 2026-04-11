import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import User from '../models/User.js';
import redis from '../../config/redis.js';
import requireAuth from '../middleware/requireAuth.js';
import { encryptUserCredentials } from '../services/credentialService.js';

const router = Router();
const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Creates a new user with encrypted credentials.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName, credentials } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const encryptedCreds = credentials ? encryptUserCredentials(credentials) : {};

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      displayName: displayName || '',
      credentials: encryptedCreds,
      lastLoginAt: new Date(),
    });

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { userId: user._id, email: user.email, jti },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Admin backdoor for hackathon demo
    if (email === 'admin@mcp.com' && password === 'admin123') {
      let adminUser = await User.findOne({ email: 'admin@mcp.com' });
      if (!adminUser) {
        const hash = await bcrypt.hash('admin123', SALT_ROUNDS);
        adminUser = await User.create({
          email: 'admin@mcp.com',
          passwordHash: hash,
          displayName: 'Admin',
          credentials: encryptUserCredentials({
            github: { accessToken: env.GITHUB_TOKEN },
            slack: { botToken: env.SLACK_BOT_TOKEN },
            jira: { baseUrl: env.JIRA_BASE_URL, email: env.JIRA_EMAIL, apiToken: env.JIRA_API_TOKEN },
          }),
        });
      }
      adminUser.lastLoginAt = new Date();
      await adminUser.save();

      const jti = crypto.randomUUID();
      const token = jwt.sign(
        { userId: adminUser._id, email: adminUser.email, jti },
        env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ token, user: adminUser.toSafeObject() });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const jti = crypto.randomUUID();
    const token = jwt.sign(
      { userId: user._id, email: user.email, jti },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's safe profile.
 */
router.get('/me', requireAuth, async (req, res) => {
  return res.json({ user: req.user.toSafeObject() });
});

/**
 * PATCH /api/auth/credentials
 * Partially updates connector credentials for the authenticated user.
 */
router.patch('/credentials', requireAuth, async (req, res, next) => {
  try {
    const updates = req.body;
    const user = req.user;
    const updatedConnectors = [];

    const encrypted = encryptUserCredentials(updates);

    for (const connector of ['github', 'slack', 'jira']) {
      if (encrypted[connector]) {
        user.credentials[connector] = {
          ...user.credentials[connector]?.toObject?.() || {},
          ...encrypted[connector],
        };
        updatedConnectors.push(connector);
      }
    }

    user.markModified('credentials');
    await user.save();

    return res.json({ user: user.toSafeObject(), updated: updatedConnectors });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/auth/credentials/:connector
 * Disconnects a specific connector by clearing its token.
 */
router.delete('/credentials/:connector', requireAuth, async (req, res, next) => {
  try {
    const { connector } = req.params;
    if (!['github', 'slack', 'jira'].includes(connector)) {
      return res.status(400).json({ error: 'Invalid connector name' });
    }

    const user = req.user;
    if (user.credentials[connector]) {
      user.credentials[connector].connected = false;
      user.credentials[connector].connectedAt = null;
      if (connector === 'github') user.credentials.github.accessToken = null;
      if (connector === 'slack') user.credentials.slack.botToken = null;
      if (connector === 'jira') user.credentials.jira.apiToken = null;
    }

    user.markModified('credentials');
    await user.save();

    return res.json({ disconnected: connector });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Adds the current JWT to a Redis blocklist.
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);

    if (decoded?.jti && decoded?.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.set(`jwt:blocklist:${decoded.jti}`, '1', { ex: ttl });
      }
    }
  } catch {
    // Redis failure is non-fatal for logout
  }

  return res.json({ loggedOut: true });
});

export default router;
