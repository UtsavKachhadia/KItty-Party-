import { useEffect } from 'react';
import socket from '../lib/socket';
import useWorkflowStore from '../store/workflowStore';
import useDagStore from '../store/dagStore';
import useUIStore from '../store/uiStore';

/**
 * Central Socket.io hook — connects on mount, subscribes to all backend events,
 * and updates the corresponding Zustand stores. Must be called once at the App root.
 */
export default function useSocket() {
  const updateStepStatus = useWorkflowStore((s) => s.updateStepStatus);
  const setStatus = useWorkflowStore((s) => s.setStatus);
  const setWorkflowCompleted = useWorkflowStore((s) => s.setWorkflowCompleted);
  const setWorkflowFailed = useWorkflowStore((s) => s.setWorkflowFailed);
  const updateNodeStatus = useDagStore((s) => s.updateNodeStatus);
  const openApprovalModal = useUIStore((s) => s.openApprovalModal);
  const appendConsoleLog = useUIStore((s) => s.appendConsoleLog);

  useEffect(() => {
    socket.connect();

    // ── step:started ──
    socket.on('step:started', (data) => {
      updateStepStatus(data.stepId, 'running');
      updateNodeStatus(data.stepId, 'running');
      setStatus('running');
      appendConsoleLog(
        `▶ ${data.connector}.${data.action} started (confidence: ${data.confidence})`
      );
    });

    // ── step:completed ──
    socket.on('step:completed', (data) => {
      updateStepStatus(data.stepId, 'completed', { result: data.result });
      updateNodeStatus(data.stepId, 'completed');
      appendConsoleLog(`✓ Step ${data.stepId} completed`);
    });

    // ── step:failed ──
    socket.on('step:failed', (data) => {
      updateStepStatus(data.stepId, 'failed', { error: data.error });
      updateNodeStatus(data.stepId, 'failed');
      appendConsoleLog(`✗ Step ${data.stepId} failed: ${data.error}`);
      if (data.diagnosis) {
        appendConsoleLog(`  IFR Diagnosis: ${data.diagnosis}`);
      }
    });

    // ── step:approval_required ──
    socket.on('step:approval_required', (data) => {
      updateStepStatus(data.stepId, 'awaiting_approval');
      updateNodeStatus(data.stepId, 'awaiting_approval');
      setStatus('awaiting_approval');
      openApprovalModal(data.runId, data.stepId, data);
      appendConsoleLog(
        `⚠ Step ${data.stepId} requires approval: ${data.description}`
      );
    });

    // ── workflow:completed ──
    socket.on('workflow:completed', (data) => {
      setWorkflowCompleted(data.summary);
      appendConsoleLog(
        `✓ Workflow completed: ${data.summary.completedSteps}/${data.summary.totalSteps} steps`
      );
    });

    // ── workflow:failed ──
    socket.on('workflow:failed', (data) => {
      const errorMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Workflow failed';
      setWorkflowFailed(errorMsg);
      appendConsoleLog(`✗ Workflow failed: ${errorMsg}`);
    });

    // ── Connection events ──
    socket.on('connect', () => {
      appendConsoleLog('🔌 Socket connected');
    });

    socket.on('disconnect', (reason) => {
      appendConsoleLog(`🔌 Socket disconnected: ${reason}`);
    });

    // ── Cleanup ──
    return () => {
      socket.off('step:started');
      socket.off('step:completed');
      socket.off('step:failed');
      socket.off('step:approval_required');
      socket.off('workflow:completed');
      socket.off('workflow:failed');
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, []);

  return socket;
}
