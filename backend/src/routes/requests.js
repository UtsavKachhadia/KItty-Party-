import { Router } from 'express';
import WorkflowRequest from '../models/WorkflowRequest.js';
import User from '../models/User.js';
import Run from '../models/Run.js';
import { callLLM, planWorkflow } from '../services/llm.js';
import { scoreDAG } from '../services/confidenceScorer.js';
import { runDAG } from '../services/dagRunner.js';
import { getConnectorHealth } from '../connectors/index.js';
import { getUserTokens } from '../services/credentialService.js';
import requireAuth from '../middleware/auth.js';
import {
  emitRequestReceived,
  emitRequestApproved,
  emitRequestRejected,
} from '../services/socketService.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * POST /api/requests
 * Create a new delegation request — User A asks to run a workflow using User B's credentials.
 *
 * Body: { prompt: string, targetUsername: string }
 */
router.post('/', async (req, res, next) => {
  try {
    const { prompt, targetUsername } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "prompt" — must be a non-empty string',
        code: 'INVALID_INPUT',
      });
    }
    if (!targetUsername || typeof targetUsername !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "targetUsername"',
        code: 'INVALID_INPUT',
      });
    }

    // Look up target user
    const targetUser = await User.findOne({
      username: targetUsername.toLowerCase().trim(),
    });
    if (!targetUser) {
      return res.status(404).json({
        error: `User @${targetUsername} not found in system`,
        code: 'USER_NOT_FOUND',
      });
    }

    // Prevent self-request
    if (targetUser._id.toString() === req.user.userId) {
      return res.status(400).json({
        error: 'You cannot send a delegation request to yourself. Use the normal workflow run instead.',
        code: 'SELF_REQUEST',
      });
    }

    // Generate human-readable summary via LLM
    let requestMessage;
    try {
      const raw = await callLLM(
        'Summarize this workflow request in 1-2 sentences for an approval notification. Be specific about what tools will be used and what actions will be taken. Return JSON: {"summary":"..."}',
        `Workflow: ${prompt}`,
        150
      );
      const parsed = JSON.parse(raw);
      requestMessage = parsed.summary || prompt;
    } catch {
      requestMessage = prompt; // Fallback to raw prompt
    }

    // Create WorkflowRequest document
    const request = await WorkflowRequest.create({
      requestingUser: req.user.userId,
      targetUser: targetUser._id,
      originalPrompt: prompt,
      requestMessage,
      status: 'PENDING',
    });

    // Emit socket event to the target user
    const io = req.app.get('io');
    emitRequestReceived(io, targetUser._id.toString(), {
      requestId: request._id,
      requestingUsername: req.user.email, // use email since we have it from JWT
      requestMessage,
      requestedAt: request.requestedAt,
    });

    return res.status(201).json({
      success: true,
      request: {
        id: request._id,
        targetUsername: targetUser.username,
        requestMessage,
        status: request.status,
        requestedAt: request.requestedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/requests/incoming
 * List delegation requests where the current user is the TARGET (requests TO me).
 */
router.get('/incoming', async (req, res, next) => {
  try {
    const requests = await WorkflowRequest.find({ targetUser: req.user.userId })
      .populate('requestingUser', 'username email -_id')
      .sort({ requestedAt: -1 })
      .lean();

    return res.json({ requests });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/requests/outgoing
 * List delegation requests the current user has INITIATED (requests FROM me).
 */
router.get('/outgoing', async (req, res, next) => {
  try {
    const requests = await WorkflowRequest.find({ requestingUser: req.user.userId })
      .populate('targetUser', 'username email -_id')
      .sort({ requestedAt: -1 })
      .lean();

    return res.json({ requests });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/requests/:id/approve
 * Target user approves a delegation request — triggers workflow planning and execution.
 */
router.patch('/:id/approve', async (req, res, next) => {
  try {
    const request = await WorkflowRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
    }

    // Only the target user can approve
    if (req.user.userId !== request.targetUser.toString()) {
      return res.status(403).json({
        error: 'Only the target user can approve this request',
        code: 'FORBIDDEN',
      });
    }

    // Check status — idempotency guard
    if (request.status !== 'PENDING') {
      return res.status(409).json({
        error: `Request already ${request.status.toLowerCase()}`,
        code: 'ALREADY_ACTIONED',
      });
    }

    // Update status
    request.status = 'APPROVED';
    request.responseAt = new Date();

    // Build executionContext for third-party execution
    const executionContext = {
      type: 'THIRD_PARTY',
      initiatingUserId: request.requestingUser,
      targetUserId: req.user.userId,
    };

    // Resolve target user's credentials
    const userTokens = await getUserTokens(req.user.userId);
    const userContext = { email: req.user.email, tokens: userTokens };

    // Pre-execution validation
    const rawDAG = await planWorkflow(request.originalPrompt);
    const availableConnectors = getConnectorHealth(userContext);
    const missingConnectors = new Set();
    for (const step of rawDAG.steps) {
      if (!availableConnectors[step.connector]?.configured) {
        missingConnectors.add(step.connector);
      }
    }
    if (missingConnectors.size > 0) {
      const missing = Array.from(missingConnectors).join(', ');
      request.status = 'FAILED';
      await request.save();
      return res.status(400).json({
        error: `Cannot execute: ${missing} token not configured`,
        code: 'MISSING_CREDENTIALS',
      });
    }

    const scoredDAG = scoreDAG(rawDAG, availableConnectors);

    // Create Run document
    const run = await Run.create({
      userId: req.user.userId,
      dag: scoredDAG,
      status: 'pending',
      steps: scoredDAG.steps,
      userInput: request.originalPrompt,
      executionContext,
    });

    request.dag = scoredDAG;
    request.runId = run._id;
    request.executedAt = new Date();
    await request.save();

    // Start DAG execution — non-blocking
    const io = req.app.get('io');
    runDAG(run, io, userContext).catch((err) => {
      console.error(`Background delegated DAG run error: ${err.message}`);
    });

    // Notify the requesting user
    emitRequestApproved(io, request.requestingUser.toString(), {
      requestId: request._id,
      runId: run._id,
    });

    return res.json({
      success: true,
      status: 'APPROVED',
      runId: run._id,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/requests/:id/reject
 * Target user rejects a delegation request.
 */
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const request = await WorkflowRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found', code: 'NOT_FOUND' });
    }

    // Only the target user can reject
    if (req.user.userId !== request.targetUser.toString()) {
      return res.status(403).json({
        error: 'Only the target user can reject this request',
        code: 'FORBIDDEN',
      });
    }

    // Check status — idempotency guard
    if (request.status !== 'PENDING') {
      return res.status(409).json({
        error: `Request already ${request.status.toLowerCase()}`,
        code: 'ALREADY_ACTIONED',
      });
    }

    request.status = 'REJECTED';
    request.responseAt = new Date();
    await request.save();

    // Notify the requesting user
    const io = req.app.get('io');
    emitRequestRejected(io, request.requestingUser.toString(), {
      requestId: request._id,
    });

    return res.json({
      success: true,
      status: 'REJECTED',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
