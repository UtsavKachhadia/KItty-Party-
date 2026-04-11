import jwt from 'jsonwebtoken';
import env from '../../config/env.js';
import User from '../models/User.js';
import redis from '../../config/redis.js';

/**
 * JWT-based authentication middleware.
 * Verifies the Bearer token, checks the Redis blocklist for revoked JWTs,
 * and attaches the full User document to req.user.
 */
export default async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Session expired, please login again' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check Redis blocklist for revoked tokens
    if (decoded.jti) {
      try {
        const blocked = await redis.get(`jwt:blocklist:${decoded.jti}`);
        if (blocked) {
          return res.status(401).json({ error: 'Token revoked' });
        }
      } catch {
        // Redis errors during blocklist check are non-fatal
      }
    }

    // Fetch full user document
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
