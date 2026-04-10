import { Router } from 'express';
import { getConnectorHealth } from '../connectors/index.js';

const router = Router();

/**
 * GET /api/connectors/health
 * Returns configuration status and available actions for each connector.
 */
router.get('/health', async (req, res, next) => {
  try {
    const health = getConnectorHealth();
    return res.json(health);
  } catch (err) {
    next(err);
  }
});

export default router;
