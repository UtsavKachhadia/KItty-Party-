import { Router } from 'express';
import crypto from 'crypto';
import User from '../models/User.js';

const router = Router();

// Helper to hash password
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Missing name, email, or password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const newUser = await User.create({
      name,
      email,
      password: hashPassword(password),
    });

    return res.json({
      token: `mcp-token-${newUser._id}`,
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Always allow the master admin backdoor without DB check
    if (email === 'admin@mcp.com' && password === 'admin123') {
      return res.json({
        token: 'hackathon-session-token',
        user: { email: 'admin@mcp.com', name: 'Admin User', role: 'admin' }
      });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.json({
      token: `mcp-token-${user._id}`,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

export default router;
