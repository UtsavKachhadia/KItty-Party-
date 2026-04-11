import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../../config/env.js';

const router = Router();

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '7d';

/**
 * POST /api/auth/signup
 * Register a new user, hash password, store connector tokens, return JWT.
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { username, email, password, connectors } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: username, email, password',
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(409).json({
        success: false,
        message: `A user with this ${field} already exists`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Build connector data
    const connectorData = {
      github: {
        token: connectors?.github?.token || '',
        isConnected: Boolean(connectors?.github?.token),
      },
      slack: {
        token: connectors?.slack?.token || '',
        isConnected: Boolean(connectors?.slack?.token),
      },
      jira: {
        apiKey: connectors?.jira?.apiKey || '',
        domain: connectors?.jira?.domain || '',
        isConnected: Boolean(connectors?.jira?.apiKey && connectors?.jira?.domain),
      },
    };

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      connectors: connectorData,
    });

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Validate credentials and return JWT with role.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Determine role — admin override for admin@system.com
    const role = user.email === 'admin@system.com' ? 'admin' : 'user';

    // Update role in DB if it changed
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role,
      },
      env.JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
