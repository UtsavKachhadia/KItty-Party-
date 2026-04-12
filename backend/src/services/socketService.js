/**
 * Socket.io event emitter wrappers.
 * All payloads include a timestamp for frontend ordering.
 */

export function emitStepStarted(io, runId, stepData) {
  io.emit('step:started', {
    runId,
    stepId: stepData.id,
    connector: stepData.connector,
    action: stepData.action,
    confidence: stepData.confidence,
    description: stepData.description,
    timestamp: new Date().toISOString(),
  });
}

export function emitStepCompleted(io, runId, stepId, result) {
  io.emit('step:completed', {
    runId,
    stepId,
    result,
    timestamp: new Date().toISOString(),
  });
}

export function emitStepFailed(io, runId, stepId, error, diagnosis) {
  io.emit('step:failed', {
    runId,
    stepId,
    error: typeof error === 'string' ? error : error.message || String(error),
    diagnosis: diagnosis || null,
    timestamp: new Date().toISOString(),
  });
}

export function emitApprovalRequired(io, runId, stepId, stepData) {
  io.emit('step:approval_required', {
    runId,
    stepId,
    connector: stepData.connector,
    action: stepData.action,
    description: stepData.description,
    params: stepData.params,
    confidence: stepData.confidence,
    timestamp: new Date().toISOString(),
  });
}

export function emitWorkflowCompleted(io, runId, summary) {
  io.emit('workflow:completed', {
    runId,
    summary,
    timestamp: new Date().toISOString(),
  });
}

export function emitWorkflowFailed(io, runId, error) {
  io.emit('workflow:failed', {
    runId,
    error: typeof error === 'string' ? error : error.message || String(error),
    timestamp: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════
// User-scoped emitters — for delegation request notifications
// ═══════════════════════════════════════════════════════

/**
 * Strips any keys that look like credentials from a socket payload.
 * Defensive measure — credentials should never reach this function,
 * but this is a last-resort safety net.
 */
function stripCredentials(data) {
  if (!data || typeof data !== 'object') return data;
  const BLOCKED_KEYS = ['token', 'password', 'secret', 'encryptedToken', 'apiKey', 'credentials'];
  const clean = { ...data };
  for (const key of BLOCKED_KEYS) {
    if (key in clean) {
      delete clean[key];
      console.warn(`[socketService] Stripped sensitive key '${key}' from socket payload`);
    }
  }
  return clean;
}

/**
 * Emit to a specific user's personal room.
 * Use for request notifications, approval results, rejections.
 */
export function emitToUser(io, userId, event, data) {
  if (!io) return;
  const safeData = stripCredentials(data);
  io.to(`user:${userId}`).emit(event, {
    ...safeData,
    timestamp: new Date().toISOString()
  });
}

export function emitRequestReceived(io, targetUserId, payload) {
  emitToUser(io, targetUserId, 'requestReceived', payload);
}

export function emitRequestApproved(io, requestingUserId, payload) {
  emitToUser(io, requestingUserId, 'requestApproved', payload);
}

export function emitRequestRejected(io, requestingUserId, payload) {
  emitToUser(io, requestingUserId, 'requestRejected', payload);
}
