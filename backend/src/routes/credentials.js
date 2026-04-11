import { Router } from 'express';
import User from '../models/User.js';
import { encrypt, maskToken } from '../utils/encryption.js';
import { saveUserTokens } from '../services/credentialService.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

const VALID_SERVICES = ['github', 'slack', 'jira'];

/**
 * POST /api/credentials/:service
 * Store or update a credential for the given service.
 *
 * Body varies by service:
 *   github: { token, owner? }
 *   slack:  { token }
 *   jira:   { token, email, domain }
 *
 * The credential is encrypted and stored in two places:
 *   1. The Token collection (via credentialService — existing system, backward-compatible)
 *   2. The User.integrations array (new, for Phase 2 delegation lookups)
 */
router.post('/:service', async (req, res, next) => {
  try {
    const { service } = req.params;

    if (!VALID_SERVICES.includes(service)) {
      return res.status(400).json({
        error: `Invalid service "${service}". Must be one of: ${VALID_SERVICES.join(', ')}`,
        code: 'INVALID_SERVICE',
      });
    }

    // Validate required fields per service
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        error: 'Token is required',
        code: 'MISSING_TOKEN',
      });
    }

    if (service === 'jira') {
      const { domain } = req.body;
      if (!domain) {
        return res.status(400).json({
          error: 'Jira domain is required',
          code: 'MISSING_DOMAIN',
        });
      }
    }

    // Build credential object for storage
    let credentialObject;
    let primaryToken = token;

    switch (service) {
      case 'github':
        credentialObject = { token, owner: req.body.owner || null };
        break;
      case 'slack':
        credentialObject = { token };
        break;
      case 'jira':
        credentialObject = {
          token,
          email: req.body.email || null,
          domain: req.body.domain,
        };
        break;
    }

    // Encrypt the full credential object
    const credJson = JSON.stringify(credentialObject);
    const encryptedToken = encrypt(credJson);
    const masked = maskToken(primaryToken);

    // ── Update User.integrations (new Phase 2 system) ──
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const entry = {
      service,
      encryptedToken,
      maskedToken: masked,
      connectedAt: new Date(),
    };

    const idx = user.integrations.findIndex((i) => i.service === service);
    if (idx >= 0) {
      user.integrations[idx] = entry;
    } else {
      user.integrations.push(entry);
    }
    await user.save();

    // ── Also update the Token collection (backward-compatible with existing credentialService) ──
    const tokenUpdatePayload = {};
    if (service === 'github') tokenUpdatePayload.github = token;
    if (service === 'slack') tokenUpdatePayload.slack = token;
    if (service === 'jira') {
      tokenUpdatePayload.jiraKey = token;
      tokenUpdatePayload.jiraDomain = req.body.domain;
    }
    await saveUserTokens(req.user.userId, tokenUpdatePayload);

    // NEVER log the raw token or return it in the response
    return res.json({
      success: true,
      service,
      maskedToken: masked,
      connectedAt: entry.connectedAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/credentials
 * List connected services for the current user (masked tokens only).
 */
router.get('/', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    const safeObj = user.toSafeObject();
    return res.json({
      success: true,
      integrations: safeObj.services || [],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/credentials/:service
 * Disconnect a service integration.
 */
router.delete('/:service', async (req, res, next) => {
  try {
    const { service } = req.params;

    if (!VALID_SERVICES.includes(service)) {
      return res.status(400).json({
        error: `Invalid service "${service}"`,
        code: 'INVALID_SERVICE',
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    // Remove from User.integrations
    user.integrations = user.integrations.filter((i) => i.service !== service);
    await user.save();

    // Also clear from Token collection (backward-compatible)
    const clearPayload = {};
    if (service === 'github') clearPayload.github = '';
    if (service === 'slack') clearPayload.slack = '';
    if (service === 'jira') {
      clearPayload.jiraKey = '';
      clearPayload.jiraDomain = '';
    }
    await saveUserTokens(req.user.userId, clearPayload);

    return res.json({
      success: true,
      message: `${service} disconnected successfully`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
