import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../../config/env.js';
import { sendWelcomeEmail } from '../services/emailService.js';
import { saveUserTokens } from '../services/credentialService.js';

const router = Router();

const SALT_ROUNDS = 12;
const JWT_EXPIRY = '7d';

// ── Helper: generate JWT ──
function generateToken(user) {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// ── Helper: safe user response ──
function safeUser(user) {
  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  };
}

/**
 * POST /api/auth/register
 * Register a new user. Fields: username, email, password.
 * Optionally accepts connector tokens for initial setup.
 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password, connectors } = req.body;

    // ── Validation ──
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address.',
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    // ── Check existing user ──
    const existingChecks = [{ username }];
    if (email) existingChecks.push({ email: email.toLowerCase() });

    const existing = await User.findOne({ $or: existingChecks });
    if (existing) {
      const field = (email && existing.email === email.toLowerCase()) ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        message: `A user with this ${field} already exists.`,
      });
    }

    // ── Hash password ──
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // ── Create user ──
    const userData = {
      username,
      passwordHash,
    };
    if (email) userData.email = email.toLowerCase();

    const user = await User.create(userData);

    // ── Save Tokens Securely (if provided) ──
    await saveUserTokens(user._id, {
      github: connectors?.github?.token,
      slack: connectors?.slack?.token,
      jiraKey: connectors?.jira?.apiKey,
      jiraDomain: connectors?.jira?.domain
    });

    // ── Issue JWT ──
    const token = generateToken(user);

    // ── Send welcome email (fire-and-forget, don't block response) ──
    if (user.email) {
      sendWelcomeEmail(user.email, user.username).catch((err) => {
        console.error('Failed to send welcome email:', err.message);
      });
    }

    return res.status(201).json({
      success: true,
      token,
      user: safeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email + password. Returns JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Identify user by username or email
    const loginIdentifier = username || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.',
      });
    }

    // ── Find user ──
    let user = await User.findOne({
      $or: [
        { email: loginIdentifier.toLowerCase() },
        { username: loginIdentifier }
      ]
    });

    // ── Admin auto-seed: creates admin account on first login attempt ──
    // If a legacy admin doc exists (from old schema), clean it up first
    if (user && (loginIdentifier.toLowerCase() === 'admin@mcp.com') && !user.username) {
      await User.deleteOne({ _id: user._id });
      user = null;
    }
    if (!user && (loginIdentifier.toLowerCase() === 'admin@mcp.com') && password === 'admin123') {
      const passwordHash = await bcrypt.hash('admin123', SALT_ROUNDS);
      user = await User.create({
        username: 'admin',
        email: 'admin@mcp.com',
        passwordHash,
        role: 'admin',
        emailVerified: true,
      });
    }

    // ── Generic error to avoid user enumeration ──
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Verify password ──
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Update last login (using updateOne to skip full-doc validation) ──
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    // ── Issue JWT ──
    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: safeUser(user),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile. Requires Bearer token.
 */
router.get('/me', async (req, res, next) => {
  try {
    // Inline auth check for this single route
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const decoded = jwt.verify(authHeader.split(' ')[1], env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    next(err);
  }
});

export default router;
