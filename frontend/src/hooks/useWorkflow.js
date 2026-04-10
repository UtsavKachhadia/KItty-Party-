import api from '../lib/api';
import useWorkflowStore from '../store/workflowStore';
import useDagStore from '../store/dagStore';
import useUIStore from '../store/uiStore';

/**
 * Hook for submitting workflows and managing workflow lifecycle.
 */
export default function useWorkflow() {
  const prompt = useWorkflowStore((s) => s.prompt);
  const setPrompt = useWorkflowStore((s) => s.setPrompt);
  const startWorkflow = useWorkflowStore((s) => s.startWorkflow);
  const setStatus = useWorkflowStore((s) => s.setStatus);
  const status = useWorkflowStore((s) => s.status);
  const reset = useWorkflowStore((s) => s.reset);
  const setDAG = useDagStore((s) => s.setDAG);
  const clearDAG = useDagStore((s) => s.clearDAG);
  const clearConsoleLogs = useUIStore((s) => s.clearConsoleLogs);
  const appendConsoleLog = useUIStore((s) => s.appendConsoleLog);

  const submitWorkflow = async (userInput) => {
    try {
      // Reset previous state
      clearDAG();
      clearConsoleLogs();
      setStatus('planning');
      appendConsoleLog(`→ Sending prompt: "${userInput}"`);

      const { data } = await api.post('/workflow/run', { userInput });

      // data = { runId, dag, status }
      startWorkflow(data.runId, data.dag, data.dag.steps);
      setDAG(data.dag.steps);
      appendConsoleLog(
        `✓ DAG planned: ${data.dag.workflowName || 'Workflow'} (${data.dag.steps.length} steps)`
      );
      appendConsoleLog(`  Run ID: ${data.runId}`);

      return data;
    } catch (err) {
      setStatus('failed');
      const msg = err.response?.data?.error || err.message;
      appendConsoleLog(`✗ Planning failed: ${msg}`);
      throw err;
    }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await api.get('/workflow/history');
      useWorkflowStore.getState().setHistory(data.history || []);
      return data.history;
    } catch (err) {
      console.error('Failed to fetch history:', err);
      return [];
    }
  };

  const canSubmit =
    status === 'idle' || status === 'completed' || status === 'failed';

  return { prompt, setPrompt, submitWorkflow, fetchHistory, reset, canSubmit, status };
}
