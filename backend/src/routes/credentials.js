'use strict';

import { Router } from 'express';
import requireAuth from '../middleware/auth.js';
import { getUserTokens, saveUserTokens } from '../services/credentialService.js';
import { logCredentialAccess, extractIP } from '../services/auditLogger.js';

const router = Router();

// Ownership note: All credential operations act on req.user.userId only.
// No document-level ownership check needed — auth middleware is sufficient.

/**
 * GET /api/credentials
 * Returns all connected services for the logged-in user.
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userTokens = await getUserTokens(req.user.userId);

    // Log a read event for each connected service
    const services = ['github', 'slack', 'jira'];
    for (const svc of services) {
      if (userTokens[svc] || (svc === 'jira' && userTokens.jira?.key)) {
        await logCredentialAccess({
          userId:    req.user.userId,
          service:   svc,
          action:    'read',
          ip:        extractIP(req),
          userAgent: req.headers['user-agent'],
          metadata:  { context: 'list-all' }
        });
      }
    }

    // Transform for UI (masked)
    const result = {
      github: userTokens.github ? true : false,
      slack:  userTokens.slack ? true : false,
      jira:   userTokens.jira?.key ? { domain: userTokens.jira.domain } : null
    };

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/credentials/:service
 * Saves or updates credentials for a specific service.
 */
router.post('/:service', requireAuth, async (req, res, next) => {
  try {
    const { service } = req.params;
    const { token, apiKey, domain } = req.body;

    const update = {};
    if (service === 'github') update.github = token;
    if (service === 'slack')  update.slack = token;
    if (service === 'jira') {
      update.jiraKey = apiKey;
      update.jiraDomain = domain;
    }

    await saveUserTokens(req.user.userId, update);

    // Generate masked token for audit if provided
    let maskedToken = '********';
    const rawToken = token || apiKey;
    if (rawToken && rawToken.length > 4) {
      maskedToken = `****${rawToken.slice(-4)}`;
    }

    // Audit: log successful write
    await logCredentialAccess({
      userId:    req.user.userId,
      service:   service,
      action:    'write',
      ip:        extractIP(req),
      userAgent: req.headers['user-agent'],
      metadata:  { context: 'save-credential', maskedToken }
    });

    return res.json({ success: true, message: `${service} credentials saved.` });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/credentials/:service
 * Deletes credentials for a specific service.
 */
router.delete('/:service', requireAuth, async (req, res, next) => {
  try {
    const { service } = req.params;

    const update = {};
    if (service === 'github') update.github = null;
    if (service === 'slack')  update.slack = null;
    if (service === 'jira') {
      update.jiraKey = null;
      update.jiraDomain = null;
    }

    await saveUserTokens(req.user.userId, update);

    // Audit: log successful delete
    await logCredentialAccess({
      userId:    req.user.userId,
      service:   service,
      action:    'delete',
      ip:        extractIP(req),
      userAgent: req.headers['user-agent']
    });

    return res.json({ success: true, message: `${service} credentials removed.` });
  } catch (err) {
    next(err);
  }
});

export default router;
