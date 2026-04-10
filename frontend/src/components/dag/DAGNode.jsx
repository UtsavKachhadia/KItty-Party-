import { Handle, Position } from 'reactflow';
import ConfidenceBar from './ConfidenceBar';

const borderMap = {
  pending: 'border-outline-variant',
  running: 'border-primary',
  completed: 'border-success',
  failed: 'border-error',
  skipped: 'border-secondary',
  awaiting_approval: 'border-tertiary',
};

const dotMap = {
  pending: 'bg-secondary',
  running: 'bg-primary animate-pulse',
  completed: 'bg-success',
  failed: 'bg-error',
  skipped: 'bg-secondary',
  awaiting_approval: 'bg-tertiary animate-pulse',
};

const connectorIcons = {
  github: 'hub',
  slack: 'forum',
  jira: 'task_alt',
};

/**
 * Custom ReactFlow node representing a single DAG step.
 * Shows connector, action, description, confidence, and status.
 */
export default function DAGNode({ data }) {
  const borderClass = borderMap[data.status] || borderMap.pending;
  const dotClass = dotMap[data.status] || dotMap.pending;

  return (
    <div
      className={`bg-surface-container-high rounded-lg border-[0.5px] ${borderClass} p-3 min-w-[220px] max-w-[260px] relative transition-all duration-300`}
    >
      {/* Target handle (left) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-outline-variant !w-2 !h-2 !border-0"
      />

      {/* Status dot */}
      <span
        className={`w-2 h-2 rounded-full absolute top-3 right-3 ${dotClass}`}
      />

      {/* Connector icon + type label */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-[14px] text-secondary">
          {connectorIcons[data.connector] || 'extension'}
        </span>
        <span className="text-[11px] text-secondary font-medium uppercase tracking-wide">
          {data.connector} · {data.action}
        </span>
      </div>

      {/* Node title / description */}
      <div className="text-[13px] font-bold text-on-surface leading-tight pr-4">
        {data.label}
      </div>

      {/* Approval badge */}
      {data.requiresApproval && data.status === 'awaiting_approval' && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="material-symbols-outlined text-[12px] text-tertiary">
            approval
          </span>
          <span className="text-[11px] text-tertiary font-medium">
            Needs approval
          </span>
        </div>
      )}

      {/* Confidence bar */}
      <ConfidenceBar value={data.confidence} />

      {/* Source handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-outline-variant !w-2 !h-2 !border-0"
      />
    </div>
  );
}
