import { create } from 'zustand';
import { stepsToReactFlow } from '../lib/dagUtils';

const useDagStore = create((set) => ({
  // ── State ──
  nodes: [],
  edges: [],

  // ── Actions ──
  setDAG: (steps) => {
    const { nodes, edges } = stepsToReactFlow(steps);
    set({ nodes, edges });
  },

  updateNodeStatus: (stepId, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === stepId ? { ...n, data: { ...n.data, status } } : n
      ),
    })),

  clearDAG: () => set({ nodes: [], edges: [] }),
}));

export default useDagStore;
