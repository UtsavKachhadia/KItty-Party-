'use strict';

import mongoose from 'mongoose';
import WorkflowRequest from '../models/WorkflowRequest.js';

/**
 * Factory middleware — verifies the authenticated user owns the requested document.
 *
 * @param {mongoose.Model} model       - The Mongoose model to query
 * @param {string} paramName           - The req.params key holding the document ID (e.g. 'id')
 * @param {string} [ownerField='user'] - The field on the document that holds the owner's ID
 *
 * Usage:
 *   router.delete('/:id', auth, requireOwnership(Credential, 'id', 'userId'), handler)
 */
export function requireOwnership(model, paramName = 'id', ownerField = 'user') {
  return async function ownershipMiddleware(req, res, next) {
    try {
      const docId = req.params[paramName];

      if (!mongoose.Types.ObjectId.isValid(docId)) {
        return res.status(400).json({ error: 'Invalid document ID format' });
      }

      const doc = await model.findById(docId);

      if (!doc) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      const ownerId = doc[ownerField];
      if (!ownerId) {
        return res.status(500).json({ error: `Owner field '${ownerField}' not found on document` });
      }

      // Note: auth middleware attaches req.user.userId (not req.user.id)
      if (ownerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({ error: 'Access denied — you do not own this resource' });
      }

      // Attach to request so route handler does not need to re-query
      req.resource = doc;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware — verifies the authenticated user is the targetUser on a WorkflowRequest.
 * Also enforces that the request is still PENDING.
 * Attaches the found request to req.resource.
 *
 * Apply AFTER auth middleware on approve and reject routes.
 */
export async function requireApprovalTarget(req, res, next) {
  try {
    const requestId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }

    const workflowRequest = await WorkflowRequest.findById(requestId);

    if (!workflowRequest) {
      return res.status(404).json({ error: 'Workflow request not found' });
    }

    // Note: auth middleware attaches req.user.userId (not req.user.id)
    if (workflowRequest.targetUser.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: 'Access denied — only the target user can approve or reject this request' });
    }

    if (workflowRequest.status !== 'PENDING') {
      return res.status(409).json({
        error: `Cannot action this request — current status is '${workflowRequest.status}'`,
        currentStatus: workflowRequest.status
      });
    }

    // Check expiry — treat expired requests as if they no longer exist for approval
    if (workflowRequest.expiresAt && workflowRequest.expiresAt < new Date()) {
      return res.status(410).json({
        error: 'This workflow request has expired and can no longer be approved',
        expiredAt: workflowRequest.expiresAt
      });
    }

    req.resource = workflowRequest;
    next();
  } catch (err) {
    next(err);
  }
}
