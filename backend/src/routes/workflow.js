import { Router } from 'express';
import Run from '../models/Run.js';
import User from '../models/User.js';
import { planWorkflow } from '../services/llm.js';
import { scoreDAG } from '../services/confidenceScorer.js';
import { runDAG } from '../services/dagRunner.js';
import { getConnectorHealth } from '../connectors/index.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/workflow/run
 * Takes a natural language instruction, plans a DAG, scores it, and starts execution.
 */
router.post('/run', requireAuth, async (req, res, next) => {
  try {
    const { userInput, options } = req.body;

    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "userInput" — must be a non-empty string',
        code: 'INVALID_INPUT',
      });
    }

    // 1. Fetch user tokens dynamically
    const { getUserTokens } = await import('../services/credentialService.js');
    const userTokens = await getUserTokens(req.user.userId);
    const userContext = { email: req.user.email, tokens: userTokens };

    // 2. Plan DAG via LLM
    const rawDAG = await planWorkflow(userInput);

    // 3. Pre-Execution Validation
    const availableConnectors = getConnectorHealth(userContext);
    const missingConnectors = new Set();
    for (const step of rawDAG.steps) {
      if (!availableConnectors[step.connector]?.configured) {
        missingConnectors.add(step.connector);
      }
    }
    if (missingConnectors.size > 0) {
      const missing = Array.from(missingConnectors).join(', ');
      return res.status(400).json({
        error: `${missing} token not configured for this user`,
        code: 'MISSING_CREDENTIALS',
      });
    }

    // 4. Score confidence
    const scoredDAG = scoreDAG(rawDAG, availableConnectors);

    // 5. Apply optional confidence threshold override
    if (options?.confidenceThreshold) {
      const threshold = parseFloat(options.confidenceThreshold);
      for (const step of scoredDAG.steps) {
        step.requiresApproval = step.confidence < threshold;
        step.autoExecute = step.confidence >= threshold;
      }
    }

    // 6. Create Run document
    const run = await Run.create({
      userId: req.user.userId,
      dag: scoredDAG,
      status: 'pending',
      steps: scoredDAG.steps,
      userInput,
    });

    // 7. Start DAG execution — non-blocking
    const io = req.app.get('io');
    runDAG(run, io, userContext).catch((err) => {
      console.error(`Background DAG run error: ${err.message}`);
    });

    // 8. Return immediately
    return res.status(202).json({
      runId: run._id,
      dag: scoredDAG,
      status: 'running',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/history
 * Returns the last 20 runs sorted by startedAt desc.
 */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const runs = await Run.find({ userId: req.user.userId })
      .sort({ startedAt: -1 })
      .limit(20)
      .lean();

    const history = runs.map((run) => ({
      runId: run._id,
      userInput: run.userInput,
      status: run.status,
      stepsTotal: run.steps.length,
      stepsCompleted: run.steps.filter((s) => s.status === 'completed').length,
      stepsFailed: run.steps.filter((s) => s.status === 'failed').length,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    }));

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workflow/run/:runId
 * Returns the full Run document for a specific runId, ensuring it belongs to the user.
 */
router.get('/run/:runId', requireAuth, async (req, res, next) => {
  try {
    const { runId } = req.params;
    const run = await Run.findOne({ _id: runId, userId: req.user.userId }).lean();

    if (!run) {
      return res.status(404).json({
        success: false,
        message: 'Run not found or access denied.',
      });
    }

    return res.json({ success: true, run });
  } catch (err) {
    next(err);
  }
});

export default router;
