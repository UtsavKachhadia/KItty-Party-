import { topologicalSort } from '../utils/dagUtils.js';
import connectors from '../connectors/index.js';
import AuditLog from '../models/AuditLog.js';
import Run from '../models/Run.js';
import redis from '../../config/redis.js';
import { handleFailure } from './ifrEngine.js';
import {
  emitStepStarted,
  emitStepCompleted,
  emitStepFailed,
  emitApprovalRequired,
  emitWorkflowCompleted,
  emitWorkflowFailed,
} from './socketService.js';

const APPROVAL_POLL_INTERVAL_MS = 500;
const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Waits for approval/rejection via Redis polling.
 * Returns "approved" | "rejected" | "timeout"
 */
async function waitForApproval(runId, stepId) {
  const key = `run:${runId}:approval:${stepId}`;
  const start = Date.now();

  while (Date.now() - start < APPROVAL_TIMEOUT_MS) {
    try {
      const value = await redis.get(key);
      if (value === 'approved') {
        await redis.del(key);
        return 'approved';
      }
      if (value === 'rejected') {
        await redis.del(key);
        return 'rejected';
      }
    } catch {
      // Redis errors during polling are non-fatal; keep trying
    }
    await new Promise((r) => setTimeout(r, APPROVAL_POLL_INTERVAL_MS));
  }
  return 'timeout';
}

/**
 * Executes a full DAG run. Updates Run document and emits socket events throughout.
 * This function NEVER throws — all errors are caught and emitted.
 */
export async function runDAG(run, io) {
  const runId = run._id.toString();

  try {
    // Mark run as running
    run.status = 'running';
    run.startedAt = new Date();
    await run.save();

    // Get execution order
    const order = topologicalSort(run.steps);
    const stepMap = {};
    for (const step of run.steps) {
      stepMap[step.id] = step;
    }

    let allSucceeded = true;

    for (const stepId of order) {
      const step = stepMap[stepId];
      if (!step) continue;

      // ── Emit step:started ──
      emitStepStarted(io, runId, step);
      step.status = 'running';
      step.startedAt = new Date();
      await Run.updateOne(
        { _id: run._id, 'steps.id': stepId },
        { $set: { 'steps.$.status': 'running', 'steps.$.startedAt': step.startedAt } }
      );

      // ── Approval gate ──
      if (step.requiresApproval) {
        emitApprovalRequired(io, runId, stepId, step);
        await Run.updateOne(
          { _id: run._id },
          { $set: { status: 'awaiting_approval' } }
        );

        const decision = await waitForApproval(runId, stepId);
        if (decision === 'rejected') {
          step.status = 'skipped';
          step.endedAt = new Date();
          await Run.updateOne(
            { _id: run._id, 'steps.id': stepId },
            { $set: { 'steps.$.status': 'skipped', 'steps.$.endedAt': step.endedAt } }
          );
          emitStepFailed(io, runId, stepId, 'Step rejected by user', null);
          continue;
        }
        if (decision === 'timeout') {
          step.status = 'skipped';
          step.endedAt = new Date();
          await Run.updateOne(
            { _id: run._id, 'steps.id': stepId },
            { $set: { 'steps.$.status': 'skipped', 'steps.$.endedAt': step.endedAt } }
          );
          emitStepFailed(io, runId, stepId, 'Approval timed out after 5 minutes', null);
          continue;
        }

        // Approved — continue execution
        await Run.updateOne(
          { _id: run._id },
          { $set: { status: 'running' } }
        );
      }

      // ── Execute step via connector ──
      const connector = connectors[step.connector];
      if (!connector) {
        const errMsg = `Connector "${step.connector}" not found`;
        step.status = 'failed';
        step.error = errMsg;
        step.endedAt = new Date();
        allSucceeded = false;

        await Run.updateOne(
          { _id: run._id, 'steps.id': stepId },
          { $set: { 'steps.$.status': 'failed', 'steps.$.error': errMsg, 'steps.$.endedAt': step.endedAt } }
        );
        await AuditLog.create({
          runId: run._id,
          stepId,
          connector: step.connector,
          action: step.action,
          request: step.params,
          response: null,
          success: false,
          errorMessage: errMsg,
          durationMs: 0,
          timestamp: new Date(),
        });
        emitStepFailed(io, runId, stepId, errMsg, null);
        continue;
      }

      const startTime = Date.now();
      const result = await connector.execute(step.action, step.params);
      const durationMs = Date.now() - startTime;

      // ── Audit log ──
      await AuditLog.create({
        runId: run._id,
        stepId,
        connector: step.connector,
        action: step.action,
        request: step.params,
        response: result.data || result.error || null,
        success: result.success,
        errorMessage: result.success ? null : result.error,
        durationMs,
        timestamp: new Date(),
      });

      if (result.success) {
        step.status = 'completed';
        step.result = result.data;
        step.endedAt = new Date();
        await Run.updateOne(
          { _id: run._id, 'steps.id': stepId },
          {
            $set: {
              'steps.$.status': 'completed',
              'steps.$.result': result.data,
              'steps.$.endedAt': step.endedAt,
            },
          }
        );
        emitStepCompleted(io, runId, stepId, result.data);
      } else {
        // ── IFR: handle failure ──
        const ifrResult = await handleFailure(result.error || result, step, run, io);

        if (ifrResult.resolved && ifrResult.retryResult?.success) {
          // Tier 1 retry or Tier 2 auto-fix succeeded
          step.status = 'completed';
          step.result = ifrResult.retryResult.data;
          step.endedAt = new Date();
          await Run.updateOne(
            { _id: run._id, 'steps.id': stepId },
            {
              $set: {
                'steps.$.status': 'completed',
                'steps.$.result': ifrResult.retryResult.data,
                'steps.$.endedAt': step.endedAt,
              },
            }
          );
          emitStepCompleted(io, runId, stepId, ifrResult.retryResult.data);
        } else {
          // Step failed — all IFR tiers exhausted
          const diagnosis = ifrResult.diagnosis
            ? `${ifrResult.diagnosis}. Suggestion: ${ifrResult.suggestion || 'N/A'}`
            : null;
          step.status = 'failed';
          step.error = result.error || 'Step execution failed';
          step.endedAt = new Date();
          allSucceeded = false;

          await Run.updateOne(
            { _id: run._id, 'steps.id': stepId },
            {
              $set: {
                'steps.$.status': 'failed',
                'steps.$.error': step.error,
                'steps.$.endedAt': step.endedAt,
              },
            }
          );
          emitStepFailed(io, runId, stepId, step.error, diagnosis);
        }
      }
    }

    // ── Finalize run ──
    const finalStatus = allSucceeded ? 'completed' : 'failed';
    run.status = finalStatus;
    run.endedAt = new Date();
    await Run.updateOne(
      { _id: run._id },
      { $set: { status: finalStatus, endedAt: run.endedAt } }
    );

    if (allSucceeded) {
      const completedSteps = run.steps.filter((s) => s.status === 'completed').length;
      emitWorkflowCompleted(io, runId, {
        totalSteps: run.steps.length,
        completedSteps,
      });
    } else {
      const failedSteps = run.steps.filter((s) => s.status === 'failed');
      emitWorkflowFailed(io, runId, {
        message: `${failedSteps.length} step(s) failed`,
        failedStepIds: failedSteps.map((s) => s.id),
      });
    }
  } catch (err) {
    // Catch-all: never crash the process
    console.error(`💥 DAG Runner fatal error for run ${runId}:`, err);
    try {
      await Run.updateOne(
        { _id: run._id },
        { $set: { status: 'failed', endedAt: new Date() } }
      );
    } catch {
      // DB update failed too — nothing more we can do
    }
    emitWorkflowFailed(io, runId, err.message || 'Internal DAG runner error');
  }
}
