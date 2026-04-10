import { create } from 'zustand';

const useWorkflowStore = create((set, get) => ({
  // ── State ──
  prompt: '',
  status: 'idle', // 'idle' | 'planning' | 'running' | 'awaiting_approval' | 'completed' | 'failed'
  currentRunId: null,
  currentDAG: null,
  steps: [],
  history: [],
  error: null,

  // ── Actions ──
  setPrompt: (prompt) => set({ prompt }),

  startWorkflow: (runId, dag, steps) =>
    set({
      currentRunId: runId,
      currentDAG: dag,
      steps: steps.map((s) => ({ ...s, status: s.status || 'pending' })),
      status: 'running',
      error: null,
    }),

  setStatus: (status) => set({ status }),

  updateStepStatus: (stepId, status, payload = {}) =>
    set((state) => ({
      steps: state.steps.map((s) =>
        s.id === stepId ? { ...s, status, ...payload } : s
      ),
    })),

  setWorkflowCompleted: (summary) =>
    set({
      status: 'completed',
    }),

  setWorkflowFailed: (error) =>
    set({
      status: 'failed',
      error,
    }),

  setHistory: (runs) => set({ history: runs }),

  addHistoryItem: (run) =>
    set((state) => ({
      history: [run, ...state.history].slice(0, 20),
    })),

  reset: () =>
    set({
      prompt: '',
      status: 'idle',
      currentRunId: null,
      currentDAG: null,
      steps: [],
      error: null,
    }),
}));

export default useWorkflowStore;
