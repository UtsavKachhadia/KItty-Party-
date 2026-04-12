'use strict';

import { Router } from 'express';
import requireAuth from '../middleware/auth.js';
import { requireApprovalTarget } from '../middleware/accessControl.js';
import WorkflowRequest from '../models/WorkflowRequest.js';
import Run from '../models/Run.js';
import { runDAG } from '../services/dagRunner.js';
import { getUserTokens } from '../services/credentialService.js';

const router = Router();

/**
 * GET /api/requests/incoming
 * Fetches all requests targeted AT the current user (waiting for their approval).
 */
router.get('/incoming', requireAuth, async (req, res, next) => {
  try {
    const requests = await WorkflowRequest.find({ targetUser: req.user.userId })
      .populate('requestingUser', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests.map(req => ({
      _id: req._id,
      requesterUsername: req.requestingUser?.username || req.requestingUser?.email || 'Unknown',
      requestMessage: req.requestMessage,
      status: req.status,
      createdAt: req.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/requests/outgoing
 * Fetches all requests created BY the current user (sent to others).
 */
router.get('/outgoing', requireAuth, async (req, res, next) => {
  try {
    const requests = await WorkflowRequest.find({ requestingUser: req.user.userId })
      .populate('targetUser', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests.map(req => ({
      _id: req._id,
      targetUsername: req.targetUser?.username || req.targetUser?.email || 'Unknown',
      requestMessage: req.requestMessage,
      status: req.status,
      createdAt: req.createdAt,
    }));

    return res.json(formatted);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/requests/:id/approve
 * Approves a pending workflow request.
 */
router.post('/:id/approve', requireAuth, requireApprovalTarget, async (req, res, next) => {
  try {
    // req.resource is already the WorkflowRequest document — provided by requireApprovalTarget
    const workflowRequest = req.resource;

    workflowRequest.status = 'APPROVED';
    workflowRequest.responseAt = new Date();
    await workflowRequest.save();

    // Trigger the workflow using the TARGET user's fully resolved token stash
    if (workflowRequest.workflowPayload?.runId) {
      const run = await Run.findById(workflowRequest.workflowPayload.runId);
      if (run) {
        // We use req.user.userId because the person approving IS the target user
        const userTokens = await getUserTokens(req.user.userId);
        const userContext = { email: req.user.email, tokens: userTokens };
        
        // Push the execution to the background engine non-blockingly
        const io = req.app.get('io');
        runDAG(run, io, userContext).catch((err) => {
          console.error(`Background DAG run error after approval: ${err.message}`);
        });
      }
    }

    return res.json({
      success: true,
      message: 'Workflow request approved successfully.',
      status:  workflowRequest.status
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/requests/:id/reject
 * Rejects a pending workflow request.
 */
router.post('/:id/reject', requireAuth, requireApprovalTarget, async (req, res, next) => {
  try {
    const workflowRequest = req.resource;

    workflowRequest.status = 'REJECTED';
    workflowRequest.responseAt = new Date();
    await workflowRequest.save();

    return res.json({
      success: true,
      message: 'Workflow request rejected.',
      status:  workflowRequest.status
    });
  } catch (err) {
    next(err);
  }
});

export default router;
