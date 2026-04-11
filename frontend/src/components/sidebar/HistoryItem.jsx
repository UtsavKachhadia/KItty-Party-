import useWorkflow from '../../hooks/useWorkflow';

/**
 * Past workflow run summary row in sidebar.
 * @param {{ run: { runId: string, userInput: string, status: string, stepsTotal: number, stepsCompleted: number } }} props
 */
export default function HistoryItem({ run }) {
  const { loadRunHistory } = useWorkflow();

  const dotColor = {
    completed: 'bg-success',
    failed: 'bg-error',
    running: 'bg-primary animate-pulse',
    pending: 'bg-secondary',
    awaiting_approval: 'bg-tertiary animate-pulse',
  };

  // Truncate user input to a reasonable label
  const label =
    run.userInput?.length > 30
      ? run.userInput.slice(0, 30) + '...'
      : run.userInput || 'Untitled workflow';

  return (
    <div
      onClick={() => loadRunHistory(run.runId)}
      className="flex items-start gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-surface-container-highest transition-colors group"
      title={run.userInput}
    >
      <span
        className={`w-[6px] h-[6px] rounded-full flex-shrink-0 mt-1.5 ${
          dotColor[run.status] || 'bg-secondary'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-on-surface-variant truncate group-hover:text-on-surface transition-colors">
          {label}
        </p>
        <p className="text-[11px] text-secondary">
          {run.stepsCompleted}/{run.stepsTotal} steps
        </p>
      </div>
    </div>
  );
}
