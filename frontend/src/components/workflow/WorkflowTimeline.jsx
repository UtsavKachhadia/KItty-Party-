import useWorkflowStore from '../../store/workflowStore';

export default function WorkflowTimeline() {
  const steps = useWorkflowStore((s) => s.steps);
  const status = useWorkflowStore((s) => s.status);
  const currentRunId = useWorkflowStore((s) => s.currentRunId);
  const currentDAG = useWorkflowStore((s) => s.currentDAG);

  if (!steps || steps.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary h-full text-sm">
        No workflow running. Type a prompt above.
      </div>
    );
  }

  const getStatusIcon = (st) => {
    switch (st) {
      case 'completed': return <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>;
      case 'failed': return <span className="material-symbols-outlined text-red-500 text-sm">cancel</span>;
      case 'running': return <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>;
      case 'awaiting_approval': return <span className="material-symbols-outlined text-yellow-500 text-sm">warning</span>;
      default: return <span className="material-symbols-outlined text-secondary text-sm">radio_button_unchecked</span>;
    }
  };

  const isThirdParty = currentDAG?.executionType === 'THIRD_PARTY';

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-surface">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-on-surface">Workflow Execution</h2>
          {isThirdParty && (
            <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-bold">
              THIRD_PARTY • Target: {currentDAG?.targetUserId || 'Unknown'}
            </span>
          )}
        </div>
        
        <div className="relative border-l border-outline-variant ml-3 space-y-6">
          {steps.map((step) => {
            const isActive = ['running', 'awaiting_approval'].includes(step.status);
            
            // Duration calculation placeholder
            const startTime = step.startedAt ? new Date(step.startedAt).getTime() : null;
            const endTime = step.endedAt ? new Date(step.endedAt).getTime() : null;
            const duration = (startTime && endTime) ? `${((endTime - startTime)/1000).toFixed(1)}s` : '';

            return (
              <div key={step.id} className={`pl-6 relative transition-opacity ${step.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
                {/* Timeline connector dot */}
                <div className={`absolute -left-[9px] top-1 w-[18px] h-[18px] rounded-full border-2 bg-surface flex items-center justify-center
                  ${isActive ? 'border-primary' : 'border-outline-variant'}
                `}>
                  {getStatusIcon(step.status)}
                </div>

                <div className={`p-4 rounded-lg border ${isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-outline-variant bg-surface-container'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-on-surface flex items-center gap-2">
                      {step.action}
                    </h3>
                    <div className="flex gap-3 items-center text-xs text-secondary">
                      {duration && <span>⏱ {duration}</span>}
                      <span className="px-2 py-0.5 bg-surface rounded inline-block font-mono border border-outline-variant">
                        {step.connector}
                      </span>
                    </div>
                  </div>
                  
                  {step.description && <p className="text-xs text-secondary mb-2">{step.description}</p>}

                  {step.status === 'awaiting_approval' && (
                    <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-xs text-yellow-500 mb-2 font-bold focus:outline-none">⚠ Requires Approval</p>
                      {/* Approval is handled by global modal in AppShell currently, but inline could go here if global wasn't capturing it */}
                    </div>
                  )}

                  {step.status === 'failed' && step.error && (
                    <div className="mt-2 p-2 bg-error/10 border border-error/30 text-error text-xs rounded font-mono break-words">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
