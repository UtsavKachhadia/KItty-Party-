import { useRef, useEffect, useCallback } from 'react';
import ReactFlow, { Background, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import DAGNode from './DAGNode';
import useDAG from '../../hooks/useDAG';
import useWorkflowStore from '../../store/workflowStore';

const nodeTypes = { dagNode: DAGNode };

/**
 * ReactFlow canvas for rendering the workflow DAG.
 * Nodes come from dagStore, edges are dynamically animated.
 */
export default function DAGCanvas() {
  const { nodes, animatedEdges } = useDAG();
  const status = useWorkflowStore((s) => s.status);
  const reactFlowRef = useRef(null);

  // Fit view after nodes are initially loaded
  useEffect(() => {
    if (nodes.length > 0 && reactFlowRef.current) {
      // Small delay to let ReactFlow finish its internal layout
      const timer = setTimeout(() => {
        reactFlowRef.current.fitView({ padding: 0.25, duration: 400 });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [nodes.length]);

  const onInit = useCallback((instance) => {
    reactFlowRef.current = instance;
  }, []);

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-surface" id="dag-canvas-empty">
        <div className="text-center">
          <span className="material-symbols-outlined text-[48px] text-outline-variant/40 mb-3 block">
            account_tree
          </span>
          <p className="text-[13px] text-secondary">
            {status === 'planning'
              ? 'Planning workflow DAG...'
              : 'Enter a workflow prompt to visualize the execution graph'}
          </p>
          {status === 'planning' && (
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <span className="text-[11px] text-primary">
                Generating DAG...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full" id="dag-canvas">
      <ReactFlow
        nodes={nodes}
        edges={animatedEdges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnScroll={true}
        zoomOnScroll={true}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background
          color="#1C1B1B"
          gap={24}
          size={1}
          style={{ backgroundColor: '#131313' }}
        />
      </ReactFlow>
    </div>
  );
}
