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

    const logs = await AuditLog.find({ 
      runId, 
      userId: req.user.userId 
    })
      .sort({ timestamp: 1 })
      .lean();

    if (!logs || logs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No audit logs found for this run or access denied.',
      });
    }

    return res.json({
      success: true,
      runId,
      totalEntries: logs.length,
      logs,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
