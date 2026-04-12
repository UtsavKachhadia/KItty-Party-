import { Router } from 'express';
import Run from '../models/Run.js';
import User from '../models/User.js';
import { planWorkflow } from '../services/llm.js';
import { detectIntent } from '../services/intentDetector.js';
import { scoreDAG } from '../services/confidenceScorer.js';
import { runDAG } from '../services/dagRunner.js';
import { getConnectorHealth } from '../connectors/index.js';
import requireAuth from '../middleware/auth.js';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';
import WorkflowRequest from '../models/WorkflowRequest.js';
import { sendInviteEmail } from '../services/emailService.js';
import { getUserTokens } from '../services/credentialService.js';

async function attemptGitHubInvite(searchStr, initiatorUserId, initiatorUsername, res) {
  const isEmail = /.+\@.+\..+/.test(searchStr);
  let destEmail = isEmail ? searchStr : null;

  if (!isEmail) {
    try {
      const tokens = await getUserTokens(initiatorUserId);
      const ghToken = tokens?.github?.accessToken || tokens?.github?.encryptedToken;
      if (ghToken) {
        const octokit = new Octokit({ auth: ghToken });
        const { data } = await octokit.users.getByUsername({ username: searchStr });
        if (data && data.email) {
          destEmail = data.email;
        } else if (data) {
          return res.status(404).json({
            error: `User matches GitHub profile '@${searchStr}', but their email is private. Cannot send invite.`,
            code: 'USER_PRIVATE_EMAIL'
          });
        }
      }
    } catch (err) {
      console.warn(`[GitHub Invite] Failed to fetch user ${searchStr}: ${err.message}`);
    }
  }

  if (destEmail) {
    const invitePromise = sendInviteEmail(destEmail, initiatorUsername, searchStr);
    
    // Create a local Placeholder user safely so the DB schema succeeds
    const placeholder = await User.create({
      username: `inv_${crypto.randomBytes(4).toString('hex')}_${searchStr}`.toLowerCase(),
      email: destEmail.toLowerCase(),
      passwordHash: 'placeholder_auth_bypass',
      isPlaceholder: true
    });

    res.locals.wasInvited = true;
    res.locals.inviteEmail = destEmail;
    res.locals.invitePromise = invitePromise;

    return placeholder;
  }

  res.status(404).json({
    error: `User '${searchStr}' not found locally or on GitHub.`,
    code: 'USER_NOT_FOUND',
  });
  return null;
}

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
        const strippedSearch = providedContext.targetUsername.replace(/^@/, '').trim();
        const searchRegex = new RegExp(`^${strippedSearch}$`, 'i');
        const targetUser = await User.findOne({
          $or: [
            { username: searchRegex },
            { email: searchRegex },
            // Even if these don't exist in the DB yet, it future-proofs the query
            { 'integrations.github.username': searchRegex },
            { 'integrations.slack.username': searchRegex }
          ]
        });
        if (!targetUser) {
          return await attemptGitHubInvite(strippedSearch, req.user.userId, req.user.username || req.user.email, res);
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
        const strippedSearch = intent.targetUsername.replace(/^@/, '').trim();
        const searchRegex = new RegExp(`^${strippedSearch}$`, 'i');
        const targetUser = await User.findOne({
          $or: [
            { username: searchRegex },
            { email: searchRegex },
            { 'integrations.github.username': searchRegex },
            { 'integrations.slack.username': searchRegex }
          ]
        });
        if (!targetUser) {
          return await attemptGitHubInvite(strippedSearch, req.user.userId, req.user.username || req.user.email, res);
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
    const userTokens = await getUserTokens(credTargetUserId);
    const targetUserDoc = await User.findById(credTargetUserId).lean();
    const userContext = { email: targetUserDoc?.email || req.user.email, tokens: userTokens };
    
    const isPlaceholder = targetUserDoc?.isPlaceholder;

    // ── Plan DAG via LLM ──
    const rawDAG = await planWorkflow(userInput);

    // ── Pre-Execution Validation ──
    const availableConnectors = getConnectorHealth(userContext);
    
    // Bypass connector checks if this is just generating a request for a placeholder 
    if (!isPlaceholder) {
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

    // ── Create Run document with multi-user execution fields ──
    const run = await Run.create({
      initiatorUser: executionContext.initiatingUserId,
      targetUser: executionContext.targetUserId,
      executionType: executionContext.type,
      requestRef: executionContext.requestRef || null,
      dag: scoredDAG,
      status: executionContext.type === 'THIRD_PARTY' ? 'awaiting_approval' : 'pending',
      steps: scoredDAG.steps,
      userInput,
    });

    if (executionContext.type === 'THIRD_PARTY') {
      // Create WorkflowRequest document for tracking
      await WorkflowRequest.create({
        requestingUser: executionContext.initiatingUserId,
        targetUser: executionContext.targetUserId,
        workflowPayload: { dag: scoredDAG, runId: run._id },
        requestMessage: userInput,
        status: 'PENDING'
      });

      if (res.locals.wasInvited) {
        await res.locals.invitePromise; // ensure email sends
        return res.status(202).json({
          runId: run._id,
          dag: scoredDAG,
          status: 'USER_INVITED',
          message: `Request created. An invite has been emailed to ${res.locals.inviteEmail}`,
          executionContext: { type: 'THIRD_PARTY', targetUsername: executionContext.targetUsername },
        });
      }
if (res.locals.wasInvited) {
        await res.locals.invitePromise; // ensure email sends
        return res.status(202).json({
          runId: run._id,
          dag: scoredDAG,
          status: 'USER_INVITED',
          message: `Request created. An invite has been emailed to ${res.locals.inviteEmail}`,
          executionContext: { type: 'THIRD_PARTY', targetUsername: executionContext.targetUsername },
        });
      }

+     // Send email notification to already-registered targeted users
+     if (targetUserDoc && targetUserDoc.email) {
+       sendInviteEmail(
+         targetUserDoc.email,
+         req.user.username || req.user.email,
+         executionContext.targetUsername
+       ).catch(err => console.error("Failed to notify registered user:", err.message));
+     }

      return res.status(202).json({
        runId: run._id,
        dag: scoredDAG,
        status: 'awaiting_approval',
-       message: 'Workflow request sent to target user.',
+       message: 'Workflow request sent and user notified via email.',
        executionContext: { type: 'THIRD_PARTY', targetUsername: executionContext.targetUsername },
      });
      return res.status(202).json({
        runId: run._id,
        dag: scoredDAG,
        status: 'awaiting_approval',
        message: 'Workflow request sent to target user.',
        executionContext: { type: 'THIRD_PARTY', targetUsername: executionContext.targetUsername },
      });
    }

    // ── Start DAG execution — non-blocking (SELF only) ──
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
    const runs = await Run.findByUser(req.user.userId)
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
      executionType: run.executionType || 'SELF',
      initiatorUser: run.initiatorUser,
      targetUser: run.targetUser,
      startedAt: run.startedAt,
      endedAt: run.endedAt,
    }));

    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

export default router;
