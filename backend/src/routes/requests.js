'use strict';

import { Router } from 'express';
import requireAuth from '../middleware/auth.js';
import { requireApprovalTarget } from '../middleware/accessControl.js';
import WorkflowRequest from '../models/WorkflowRequest.js';

const router = Router();

/**
 * PATCH /api/requests/:id/approve
 * Approves a pending workflow request.
 */
router.patch('/:id/approve', requireAuth, requireApprovalTarget, async (req, res, next) => {
  try {
    // req.resource is already the WorkflowRequest document — provided by requireApprovalTarget
    const workflowRequest = req.resource;

    workflowRequest.status = 'APPROVED';
    workflowRequest.responseAt = new Date();
    await workflowRequest.save();

    // Logic for triggering the workflow would go here (Phase 4/6)

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
 * PATCH /api/requests/:id/reject
 * Rejects a pending workflow request.
 */
router.patch('/:id/reject', requireAuth, requireApprovalTarget, async (req, res, next) => {
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
