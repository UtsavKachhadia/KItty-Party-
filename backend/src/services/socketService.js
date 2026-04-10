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
