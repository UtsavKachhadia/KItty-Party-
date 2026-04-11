import { Router } from 'express';
import { getConnectorHealth } from '../connectors/index.js';
import { getDecryptedCredentials } from '../services/credentialService.js';

const router = Router();

/**
 * GET /api/connectors/health
 * Returns per-user connector configuration status and available actions.
 */
router.get('/health', async (req, res, next) => {
  try {
    let userCredentials = null;
    if (req.userId) {
      try {
        userCredentials = await getDecryptedCredentials(req.userId);
      } catch {
        // If credentials can't be decrypted, show all as unconfigured
      }
    }
    const health = getConnectorHealth(userCredentials);
    return res.json(health);
  } catch (err) {
    next(err);
  }
});

export default router;
