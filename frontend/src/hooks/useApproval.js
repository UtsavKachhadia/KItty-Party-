import { useState } from 'react';
import api from '../lib/api';
import useUIStore from '../store/uiStore';
import useWorkflowStore from '../store/workflowStore';

/**
 * Hook for handling approval modal actions.
 */
export default function useApproval() {
  const approvalModal = useUIStore((s) => s.approvalModal);
  const closeApprovalModal = useUIStore((s) => s.closeApprovalModal);
  const setStatus = useWorkflowStore((s) => s.setStatus);
  const appendConsoleLog = useUIStore((s) => s.appendConsoleLog);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const approve = async () => {
    if (!approvalModal.runId || !approvalModal.stepId) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/execute/approve', {
        runId: approvalModal.runId,
        stepId: approvalModal.stepId,
      });
      appendConsoleLog(`✓ Step ${approvalModal.stepId} approved`);
      closeApprovalModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve');
      appendConsoleLog(`✗ Approval failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reject = async () => {
    if (!approvalModal.runId || !approvalModal.stepId) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/execute/reject', {
        runId: approvalModal.runId,
        stepId: approvalModal.stepId,
      });
      appendConsoleLog(`⊘ Step ${approvalModal.stepId} skipped`);
      closeApprovalModal();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
      appendConsoleLog(`✗ Rejection failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const skip = reject;

  const abort = async () => {
    await reject();
    setStatus('failed');
    appendConsoleLog('⊘ Workflow aborted by user');
  };

  return { approve, reject, skip, abort, loading, error, approvalModal };
}
