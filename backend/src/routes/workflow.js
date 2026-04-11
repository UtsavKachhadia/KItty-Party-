import { Router } from 'express';
import Run from '../models/Run.js';
import User from '../models/User.js';
import { planWorkflow } from '../services/llm.js';
import { detectIntent } from '../services/intentDetector.js';
import { scoreDAG } from '../services/confidenceScorer.js';
import { runDAG } from '../services/dagRunner.js';
import { getConnectorHealth } from '../connectors/index.js';
import requireAuth from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/workflow/run
 * Takes a natural language instruction, detects execution intent,
 * plans a DAG, scores it, and starts execution.
 *
 * Flow:
 *   1. Authenticate user
 *   2. Validate input
 *   3. Detect intent (SELF / THIRD_PARTY / AMBIGUOUS)
 *      - If executionContext provided in body, skip intent detection (second-call bypass)
 *      - If AMBIGUOUS: return 202 asking for clarification
 *      - If THIRD_PARTY: validate target user exists
 *   4. Plan DAG via LLM
 *   5. Score confidence
 *   6. Create Run document with executionContext
 *   7. Start DAG execution (non-blocking)
 */
router.post('/run', requireAuth, async (req, res, next) => {
  try {
    const { userInput, options, executionContext: providedContext } = req.body;

    if (!userInput || typeof userInput !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "userInput" — must be a non-empty string',
        code: 'INVALID_INPUT',
      });
    }

    // ── Build executionContext ──
    let executionContext;

    if (providedContext) {
      // Second-call bypass — user resolved ambiguity
      if (!['SELF', 'THIRD_PARTY'].includes(providedContext.type)) {
        return res.status(400).json({
          error: 'executionContext.type must be "SELF" or "THIRD_PARTY"',
          code: 'INVALID_CONTEXT',
        });
      }

      if (providedContext.type === 'THIRD_PARTY') {
        if (!providedContext.targetUsername) {
          return res.status(400).json({
            error: 'executionContext.targetUsername is required for THIRD_PARTY',
            code: 'INVALID_CONTEXT',
          });
        }
        const targetUser = await User.findOne({
          username: providedContext.targetUsername.toLowerCase(),
        });
        if (!targetUser) {
          return res.status(404).json({
            error: `User @${providedContext.targetUsername} not found in system`,
            code: 'USER_NOT_FOUND',
          });
        }
        executionContext = {
          type: 'THIRD_PARTY',
          initiatingUserId: req.user.userId,
          targetUserId: targetUser._id,
          targetUsername: targetUser.username,
        };
      } else {
        executionContext = {
          type: 'SELF',
          initiatingUserId: req.user.userId,
          targetUserId: req.user.userId,
        };
      }
    } else {
      // First call — detect intent via LLM
      const intent = await detectIntent(userInput);

      if (intent.executionType === 'AMBIGUOUS') {
        // Return 202 asking for clarification — do NOT create a Run document
        return res.status(202).json({
          status: 'NEEDS_CLARIFICATION',
          question: 'Who should this workflow run for — yourself or someone else?',
          detectedContext: { reasoning: intent.reasoning },
        });
      }

      if (intent.executionType === 'THIRD_PARTY') {
        const targetUser = await User.findOne({
          username: intent.targetUsername,
        });
        if (!targetUser) {
          return res.status(404).json({
            error: `User @${intent.targetUsername} not found in system`,
            code: 'USER_NOT_FOUND',
          });
        }
        executionContext = {
          type: 'THIRD_PARTY',
          initiatingUserId: req.user.userId,
          targetUserId: targetUser._id,
          targetUsername: targetUser.username,
        };
      } else {
        // SELF
        executionContext = {
          type: 'SELF',
          initiatingUserId: req.user.userId,
          targetUserId: req.user.userId,
        };
      }
    }

    // ── Resolve credentials for the target user ──
    const credTargetUserId = executionContext.targetUserId;
    const { getUserTokens } = await import('../services/credentialService.js');
    const userTokens = await getUserTokens(credTargetUserId);
    const targetUserDoc = await User.findById(credTargetUserId).lean();
    const userContext = { email: targetUserDoc?.email || req.user.email, tokens: userTokens };

    // ── Plan DAG via LLM ──
    const rawDAG = await planWorkflow(userInput);

    // ── Pre-Execution Validation ──
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

    // ── Score confidence ──
    const scoredDAG = scoreDAG(rawDAG, availableConnectors);

    // ── Apply optional confidence threshold override ──
    if (options?.confidenceThreshold) {
      const threshold = parseFloat(options.confidenceThreshold);
      for (const step of scoredDAG.steps) {
        step.requiresApproval = step.confidence < threshold;
        step.autoExecute = step.confidence >= threshold;
      }
    }

    // ── Create Run document with executionContext ──
    const run = await Run.create({
      userId: req.user.userId,
      dag: scoredDAG,
      status: 'pending',
      steps: scoredDAG.steps,
      userInput,
      executionContext,
    });

    // ── Start DAG execution — non-blocking ──
    const io = req.app.get('io');
    runDAG(run, io, userContext).catch((err) => {
      console.error(`Background DAG run error: ${err.message}`);
    });

    // ── Return immediately ──
    return res.status(202).json({
      runId: run._id,
      dag: scoredDAG,
      status: 'running',
      executionContext: {
        type: executionContext.type,
        targetUsername: executionContext.targetUsername || null,
      },
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
      executionContext: run.executionContext || { type: 'SELF' },
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    }));

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
