import { create } from 'zustand';

const useUIStore = create((set) => ({
  // ── State ──
  activeTab: 'steps', // 'steps' | 'console' | 'json'
  activePage: 'workflow', // 'workflow' | 'history' | 'settings'
  approvalModal: {
    open: false,
    runId: null,
    stepId: null,
    payload: null,
  },
  consoleLogs: [],

  // ── Actions ──
  setActiveTab: (tab) => set({ activeTab: tab }),

  setActivePage: (page) => set({ activePage: page }),

  openApprovalModal: (runId, stepId, payload) =>
    set({
      approvalModal: { open: true, runId, stepId, payload },
    }),

  closeApprovalModal: () =>
    set({
      approvalModal: { open: false, runId: null, stepId: null, payload: null },
    }),

  appendConsoleLog: (line) =>
    set((state) => ({
      consoleLogs: [
        ...state.consoleLogs,
        `[${new Date().toISOString().slice(11, 19)}] ${line}`,
      ],
    })),

  clearConsoleLogs: () => set({ consoleLogs: [] }),
}));

export default useUIStore;
