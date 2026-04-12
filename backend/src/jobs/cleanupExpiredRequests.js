'use strict';

import cron from 'node-cron';
import WorkflowRequest from '../models/WorkflowRequest.js';

import { emitToUser } from '../services/socketService.js';

/**
 * Finds all PENDING WorkflowRequests past their expiresAt, marks them EXPIRED,
 * and emits Socket.IO notifications to both the requesting and target users.
 *
 * Safe to run: all errors are caught and logged without crashing the process.
 */
export async function runCleanup() {
  const startedAt = new Date();
  console.log(`[cleanupExpiredRequests] Starting cleanup at ${startedAt.toISOString()}`);

  try {
    // Dynamically import io to avoid circular dependencies
    const { io } = await import('../server.js');
    if (!io) {
       console.warn('[cleanupExpiredRequests] Socket.io not initialized. Skipping notifications.');
    }

    const expiredRequests = await WorkflowRequest.find({
      status:    'PENDING',
      expiresAt: { $lt: new Date() }
    }).select('_id requestingUser targetUser requestMessage expiresAt');

    if (!expiredRequests.length) {
      console.log('[cleanupExpiredRequests] No expired requests found.');
      return;
    }

    console.log(`[cleanupExpiredRequests] Found ${expiredRequests.length} expired request(s)`);

    // Bulk update — efficient single DB write
    const ids = expiredRequests.map(r => r._id);
    await WorkflowRequest.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'EXPIRED', responseAt: new Date() } }
    );

    // Notify users — per-document because we need both user IDs
    for (const request of expiredRequests) {
      const payload = {
        requestId:   request._id.toString(),
        expiredAt:   request.expiresAt,
        message:     'A workflow request has expired without response.'
      };

      try {
        if (io) {
          // Notify the target user (who failed to respond)
          emitToUser(io, request.targetUser.toString(), 'requestExpired', {
            ...payload,
            role: 'target',
            hint: 'This request was not approved within the allowed time and has been automatically cancelled.'
          });

          // Notify the requesting user (whose request was not acted on)
          emitToUser(io, request.requestingUser.toString(), 'requestExpired', {
            ...payload,
            role: 'requester',
            hint: 'Your workflow request expired because it was not approved in time. You may submit a new request.'
          });
        }
      } catch (emitErr) {
        // Socket emit failure must not abort the cleanup loop
        console.warn(`[cleanupExpiredRequests] Socket emit failed for request ${request._id}:`, emitErr.message);
      }
    }

    const elapsed = Date.now() - startedAt.getTime();
    console.log(`[cleanupExpiredRequests] Expired ${expiredRequests.length} request(s) in ${elapsed}ms`);

  } catch (err) {
    // Never crash the server — log and exit gracefully
    console.error('[cleanupExpiredRequests] Fatal error during cleanup run:', err.message);
  }
}

/**
 * Registers the cleanup job with node-cron.
 * Call this once from server.js on startup.
 *
 * Schedule: every hour at minute 0  ('0 * * * *')
 * Timezone: UTC — consistent regardless of server location
 */
export function registerCleanupJob() {
  // Validate environment before scheduling
  if (!process.env.MONGODB_URI) {
    console.warn('[cleanupExpiredRequests] MONGODB_URI not set — cleanup job not registered');
    return null;
  }

  const job = cron.schedule('0 * * * *', async () => {
    await runCleanup();
  }, {
    timezone: 'UTC'
  });

  console.log('[cleanupExpiredRequests] Hourly cleanup job registered (runs at :00 every hour UTC)');

  // Run once immediately on startup to catch any requests that expired while
  // the server was down (e.g. after a Railway restart)
  runCleanup().catch(err =>
    console.error('[cleanupExpiredRequests] Startup cleanup run failed:', err.message)
  );

  return job;
}
