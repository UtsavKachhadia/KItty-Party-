'use strict';

import { Router } from 'express';
import requireAuth from '../middleware/auth.js';
import User from '../models/User.js';
import CredentialAuditLog from '../models/CredentialAuditLog.js';

const router = Router();

/**
 * Admin-only middleware.
 * Checks that req.user.role === 'admin' by re-querying the latest role from the DB.
 *
 * Prerequisites:
 * - auth middleware must run first (provides req.user)
 * - User model must have a 'role' field with value 'admin' for admin users
 *
 * For the hackathon: set role via a manual MongoDB update on your admin user document:
 *   db.users.updateOne({ email: 'you@example.com' }, { $set: { role: 'admin' } })
 */
async function requireAdmin(req, res, next) {
  try {
    const user = await User.findById(req.user.userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/audit
 * Returns credential audit log entries with filtering support.
 *
 * Query params:
 *   userId   - filter by user ID
 *   service  - filter by service name ('github', 'slack', 'jira')
 *   action   - filter by action ('read', 'write', 'delete')
 *   from     - ISO date string — entries after this timestamp
 *   to       - ISO date string — entries before this timestamp
 *   limit    - max results (default 100, max 500)
 *   page     - page number for pagination (default 1)
 *
 * Response:
 *   { total, page, limit, pages, entries: [...] }
 *
 * Security:
 *   - Requires auth + admin role
 *   - Never returns encryptedToken, passwordHash
 *   - IP addresses are returned (legitimate for audit review)
 */
router.get('/audit', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const {
      userId, service, action,
      from, to,
      limit: rawLimit = 100,
      page:  rawPage  = 1
    } = req.query;

    const limit = Math.min(parseInt(rawLimit, 10) || 100, 500);
    const page  = Math.max(parseInt(rawPage,  10) || 1, 1);
    const skip  = (page - 1) * limit;

    // Build filter object — only include defined params
    const filter = {};
    if (userId)  filter.userId  = userId;
    if (service) filter.service = service;
    if (action)  filter.action  = action;
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to)   filter.timestamp.$lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      CredentialAuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email')  // safe fields only — no passwordHash
        .lean(),
      CredentialAuditLog.countDocuments(filter)
    ]);

    res.json({
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      entries
    });
  } catch (err) {
    next(err);
  }
});

export default router;
