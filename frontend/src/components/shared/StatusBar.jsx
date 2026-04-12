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
    idle: '#9a9080',
    planning: '#c9a84c',
    running: '#c9a84c',
    awaiting_approval: '#b8860b',
    completed: '#2e7d52',
    failed: '#c0392b',
  };

  const statusColor = statusColorMap[status] || '#9a9080';

  if (total === 0 && status === 'idle') {
    return (
      <footer
        id="statusbar"
        className="h-[32px] flex items-center justify-between px-5 text-[11px] flex-shrink-0 border-t"
        style={{ background: '#f0ece0', borderColor: '#d0c9bc', fontFamily: "'JetBrains Mono', monospace", color: '#9a9080' }}
      >
        <span>Ready — enter a workflow prompt to begin</span>
        <span>v1.0.0</span>
      </footer>
    );
  }

  return (
    <footer
      id="statusbar"
      className="h-[32px] flex items-center justify-between px-5 text-[11px] flex-shrink-0 border-t"
      style={{ background: '#f0ece0', borderColor: '#d0c9bc', fontFamily: "'JetBrains Mono', monospace" }}
    >
      <span style={{ color: statusColor }}>
        {total > 0 && status !== 'idle' && status !== 'planning'
          ? `Step ${completed + (running ? 1 : 0)} of ${total} — `
          : ''}
        {statusMessages[status]}
      </span>
      <span style={{ color: statusColor }}>
        {total > 0 ? `${completed} / ${total} DONE` : ''}
      </span>
    </footer>
  );
}
