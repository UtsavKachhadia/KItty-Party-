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
      const msg = err.response?.data?.message || err.message;
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

  const loadRunHistory = async (runId) => {
    try {
      // 1. Switch to workflow page and reset UI
      useUIStore.getState().setActivePage('workflow');
      clearDAG();
      clearConsoleLogs();
      
      // 2. Fetch full run details
      const { data: runRes } = await api.get(`/workflow/run/${runId}`);
      const run = runRes.run;

      // 3. Hydrate state
      setPrompt(run.userInput);
      startWorkflow(run._id, run.dag, run.steps);
      setDAG(run.steps);
      setStatus(run.status);

      appendConsoleLog(`↺ Loading history for: "${run.userInput}"`);
      appendConsoleLog(`  Run ID: ${runId}`);
      appendConsoleLog(`  Status: ${run.status.toUpperCase()}`);

      // 4. Fetch and display actual audit logs
      const { data: auditRes } = await api.get(`/audit/${runId}`);
      if (auditRes.logs) {
        auditRes.logs.forEach(log => {
          const icon = log.success ? '✓' : '✗';
          appendConsoleLog(`${icon} [${log.connector}.${log.action}] ${log.success ? 'Success' : 'Failed'}`);
          if (!log.success) appendConsoleLog(`  Error: ${log.errorMessage}`);
        });
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      appendConsoleLog('✗ Failed to load run history');
    }
  };

  const canSubmit =
    status === 'idle' || status === 'completed' || status === 'failed';

  return { prompt, setPrompt, submitWorkflow, fetchHistory, loadRunHistory, reset, canSubmit, status };
}
