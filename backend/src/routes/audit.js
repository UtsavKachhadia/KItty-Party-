import { Router } from 'express';
import AuditLog from '../models/AuditLog.js';
import Run from '../models/Run.js';

const router = Router();

/**
 * GET /api/audit/:runId
 * Returns all audit log entries for a given run, filtered by userId.
 * If the run doesn't belong to the authenticated user, returns 404.
 */
router.get('/:runId', async (req, res, next) => {
  try {
    const { runId } = req.params;

    // Verify the run belongs to this user
    const run = await Run.findOne({ _id: runId, userId: req.userId }).lean();
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const logs = await AuditLog.find({ runId, userId: req.userId })
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
