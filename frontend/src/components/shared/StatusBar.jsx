import useWorkflowStore from '../../store/workflowStore';

/**
 * 32px bottom status strip.
 * Shows: "Step N of M — status message" left | "N / M DONE" right.
 */
export default function StatusBar() {
  const steps = useWorkflowStore((s) => s.steps);
  const status = useWorkflowStore((s) => s.status);

  const completed = steps.filter((s) => s.status === 'completed').length;
  const failed = steps.filter((s) => s.status === 'failed').length;
  const running = steps.find((s) => s.status === 'running');
  const total = steps.length;

  const statusColorMap = {
    idle: 'text-secondary',
    planning: 'text-primary',
    running: 'text-primary',
    awaiting_approval: 'text-tertiary',
    completed: 'text-success',
    failed: 'text-error',
  };

  const statusMessages = {
    idle: 'Ready',
    planning: 'Planning workflow...',
    running: running
      ? `Executing ${running.connector}.${running.action}`
      : 'Running...',
    awaiting_approval: 'Awaiting approval...',
    completed: 'All steps completed',
    failed: `Workflow failed (${failed} error${failed !== 1 ? 's' : ''})`,
  };

  const colorClass = statusColorMap[status] || 'text-secondary';

  if (total === 0 && status === 'idle') {
    return (
      <footer
        id="statusbar"
        className="h-[32px] bg-surface-container-high border-t border-[0.5px] border-outline-variant/20 flex items-center justify-between px-4 text-[11px] flex-shrink-0"
      >
        <span className="text-secondary">Ready — enter a workflow prompt to begin</span>
        <span className="text-secondary font-mono">v1.0.0</span>
      </footer>
    );
  }

  return (
    <footer
      id="statusbar"
      className="h-[32px] bg-surface-container-high border-t border-[0.5px] border-outline-variant/20 flex items-center justify-between px-4 text-[11px] flex-shrink-0"
    >
      <span className={colorClass}>
        {total > 0 && status !== 'idle' && status !== 'planning'
          ? `Step ${completed + (running ? 1 : 0)} of ${total} — `
          : ''}
        {statusMessages[status]}
      </span>
      <span className={`font-mono tabular-nums ${colorClass}`}>
        {total > 0 ? `${completed} / ${total} DONE` : ''}
      </span>
    </footer>
  );
}
