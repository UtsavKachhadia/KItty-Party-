import { Router } from 'express';
import Run from '../models/Run.js';
import User from '../models/User.js';
import redis from '../../config/redis.js';
import { runDAG } from '../services/dagRunner.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/workflow/replay/:runId
 * Clones a previous run's DAG into a new Run and re-executes it.
 */
router.post('/workflow/replay/:runId', requireAuth, async (req, res, next) => {
  try {
    const { runId } = req.params;
    const { newParams } = req.body || {};

    const original = await Run.findById(runId).lean();
    if (!original) {
      return res.status(404).json({ error: `Run ${runId} not found`, code: 'NOT_FOUND' });
    }

    // Clone steps, optionally override params
    const clonedSteps = original.steps.map((step) => ({
      id: step.id,
      connector: step.connector,
      action: step.action,
      params: newParams?.[step.id]
        ? { ...step.params, ...newParams[step.id] }
        : { ...step.params },
      dependsOn: step.dependsOn || [],
      status: 'pending',
      confidence: step.confidence,
      requiresApproval: step.requiresApproval,
      autoExecute: step.autoExecute,
      description: step.description || '',
      result: null,
      error: null,
      startedAt: null,
      endedAt: null,
    }));

    const newRun = await Run.create({
      workflowId: original.workflowId,
      dag: original.dag,
      status: 'pending',
      steps: clonedSteps,
      userInput: original.userInput,
    });

    // Fetch full user document for connector credentials
    const fullUser = await User.findById(req.user.userId).lean();

    const io = req.app.get('io');
    runDAG(newRun, io, fullUser).catch((err) => {
      console.error(`Background replay run error: ${err.message}`);
    });

    return res.status(202).json({
      newRunId: newRun._id,
      dag: original.dag,
      status: 'running',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/execute/approve
 * Sets Redis approval key so dagRunner can proceed.
 */
router.post('/execute/approve', requireAuth, async (req, res, next) => {
  try {
    const { runId, stepId } = req.body;

    if (!runId || !stepId) {
      return res.status(400).json({
        error: 'Missing required fields: runId, stepId',
        code: 'INVALID_INPUT',
      });
    }

    const key = `run:${runId}:approval:${stepId}`;
    await redis.set(key, 'approved', 600); // TTL 10 min
    return res.json({ approved: true, runId, stepId });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/execute/reject
 * Sets Redis rejection key so dagRunner skips the step.
 */
router.post('/execute/reject', requireAuth, async (req, res, next) => {
  try {
    const { runId, stepId } = req.body;

    if (!runId || !stepId) {
      return res.status(400).json({
        error: 'Missing required fields: runId, stepId',
        code: 'INVALID_INPUT',
      });
    }

    const key = `run:${runId}:approval:${stepId}`;
    await redis.set(key, 'rejected', 600);
    return res.json({ rejected: true, runId, stepId });
  } catch (err) {
    next(err);
  }
});

export default router;
