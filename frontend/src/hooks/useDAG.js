import { useMemo } from 'react';
import useDagStore from '../store/dagStore';
import { STATUS_BORDER_COLORS } from '../lib/dagUtils';

/**
 * Hook providing ReactFlow-ready nodes and edges with dynamic edge styling.
 */
export default function useDAG() {
  const nodes = useDagStore((s) => s.nodes);
  const edges = useDagStore((s) => s.edges);

  // Compute animated edges based on node statuses
  const animatedEdges = useMemo(() => {
    return edges.map((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      const targetNode = nodes.find((n) => n.id === e.target);
      const isActive =
        sourceNode?.data?.status === 'completed' &&
        targetNode?.data?.status === 'running';

      return {
        ...e,
        animated: isActive,
        style: {
          stroke:
            STATUS_BORDER_COLORS[targetNode?.data?.status || 'pending'],
          strokeWidth: 1,
        },
      };
    });
  }, [nodes, edges]);

  return { nodes, animatedEdges };
}
