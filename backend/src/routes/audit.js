import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';

const router = Router();

/**
 * GET /api/audit/:runId
 * Returns all audit log entries for a given run, sorted by timestamp.
 */
router.get('/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;

    const logs = await AuditLog.find({ runId })
      .sort({ timestamp: 1 })
      .lean();

    return res.json({
      runId,
      totalEntries: logs.length,
      logs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
