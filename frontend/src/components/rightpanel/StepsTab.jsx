import useWorkflowStore from '../../store/workflowStore';
import { ConfidenceInfoIcon } from '../dag/ConfidenceBar';

const iconMap = {
  pending: { icon: 'radio_button_unchecked', color: 'text-secondary', spin: false },
  running: { icon: 'progress_activity', color: 'text-primary', spin: true },
  completed: { icon: 'check_circle', color: 'text-success', spin: false },
  failed: { icon: 'error', color: 'text-error', spin: false },
  skipped: { icon: 'block', color: 'text-secondary', spin: false },
  awaiting_approval: { icon: 'pending', color: 'text-tertiary', spin: true },
};

/**
 * STEPS tab — ordered list of workflow steps with status icons.
 */
export default function StepsTab() {
  const steps = useWorkflowStore((s) => s.steps);
  const status = useWorkflowStore((s) => s.status);

  if (steps.length === 0) {
    return (
      <div className="p-4 text-center">
        <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-2">
          format_list_numbered
        </span>
        <p className="text-[11px] text-secondary">
          {status === 'planning'
            ? 'Planning steps...'
            : 'Steps will appear here after running a workflow'}
        </p>
      </div>
    );
  }

  return (
    <div id="steps-tab" className="py-1">
      {steps.map((step, idx) => {
        const { icon, color, spin } = iconMap[step.status] || iconMap.pending;
        const isActive = step.status === 'running';

        return (
          <div
            key={step.id}
            className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-[0.5px] border-outline-variant/10 transition-colors ${
              isActive ? 'bg-surface-container-highest' : ''
            }`}
          >
            {/* Status icon */}
            <span
              className={`material-symbols-outlined text-[18px] mt-0.5 flex-shrink-0 ${color} ${
                spin ? 'animate-spin' : ''
              }`}
            >
              {icon}
            </span>

            {/* Step info */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-on-surface font-medium leading-tight">
                {step.description || `${step.connector}.${step.action}`}
              </p>
              <p className="text-[11px] text-secondary mt-0.5 flex items-center">
                {step.connector}.{step.action}
                {step.confidence != null && (
                  <>
                    <span className="ml-2 font-mono tabular-nums">
                      · {step.confidence.toFixed(2)}
                    </span>
                    <span className="ml-1">
                      <ConfidenceInfoIcon />
                    </span>
                  </>
                )}
              </p>

              {/* Error message */}
              {step.status === 'failed' && step.error && (
                <p className="text-[11px] text-error mt-1 leading-snug">
                  {step.error}
                </p>
              )}

              {/* Result preview */}
              {step.status === 'completed' && step.result && (
                <p className="text-[11px] text-success mt-1 truncate">
                  ✓{' '}
                  {typeof step.result === 'string'
                    ? step.result
                    : 'Completed successfully'}
                </p>
              )}
            </div>

            {/* Step number */}
            <span className="text-[11px] text-secondary font-mono tabular-nums flex-shrink-0">
              {idx + 1}
            </span>
          </div>
        );
      })}
    </div>
  );
}
