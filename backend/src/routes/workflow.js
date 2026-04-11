import { Router } from 'express';
import Run from '../models/Run.js';
import { planWorkflow } from '../services/llm.js';
import { scoreDAG } from '../services/confidenceScorer.js';
import { runDAG } from '../services/dagRunner.js';
import { getConnectorHealth } from '../connectors/index.js';
import { getDecryptedCredentials } from '../services/credentialService.js';

const router = Router();

/**
 * POST /api/workflow/run
 * Takes a natural language instruction, plans a DAG, scores it, and starts execution.
 * Requires authentication. Uses the authenticated user's credentials.
 */
router.post('/run', async (req, res, next) => {
  try {
    const { userInput, options } = req.body;

    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "userInput" — must be a non-empty string',
        code: 'INVALID_INPUT',
      });
    }

    // Fetch user's decrypted credentials
    const userCredentials = await getDecryptedCredentials(req.userId);

    // 1. Plan DAG via LLM
    const rawDAG = await planWorkflow(userInput);

    // 2. Score confidence
    const availableConnectors = getConnectorHealth(userCredentials);
    const scoredDAG = scoreDAG(rawDAG, availableConnectors);

    // 3. Apply optional confidence threshold override
    if (options?.confidenceThreshold) {
      const threshold = parseFloat(options.confidenceThreshold);
      for (const step of scoredDAG.steps) {
        step.requiresApproval = step.confidence < threshold;
        step.autoExecute = step.confidence >= threshold;
      }
    }

    // 4. Create Run document with userId
    const run = await Run.create({
      dag: scoredDAG,
      status: 'pending',
      steps: scoredDAG.steps,
      userInput,
      userId: req.userId,
    });

    // 5. Start DAG execution — non-blocking with user credentials
    const io = req.app.get('io');
    runDAG(run, io, userCredentials).catch((err) => {
      console.error(`Background DAG run error: ${err.message}`);
    });

    // 6. Return immediately
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
 * Returns the last 20 runs for the authenticated user, sorted by startedAt desc.
 */
router.get('/history', async (req, res, next) => {
  try {
    const runs = await Run.find({ userId: req.userId })
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

export default router;
