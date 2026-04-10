import useApproval from '../../hooks/useApproval';
import useUIStore from '../../store/uiStore';

/**
 * Glassmorphism approval overlay modal.
 * Triggered by step:approval_required socket event.
 * Actions: Approve, Skip, Abort.
 */
export default function ApprovalModal() {
  const approvalModal = useUIStore((s) => s.approvalModal);
  const { approve, skip, abort, loading, error } = useApproval();

  const payload = approvalModal.payload;
  if (!payload) return null;

  return (
    <div
      id="approval-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-high/85 backdrop-blur-[20px]"
    >
      <div className="bg-surface-container-high rounded-lg border-[0.5px] border-outline-variant p-6 max-w-[380px] w-full mx-4 animate-in">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-[20px] text-tertiary">
            warning
          </span>
          <span className="text-[13px] font-bold text-on-surface">
            Approval Needed
          </span>
        </div>

        {/* Step description */}
        <p className="text-[13px] text-on-surface-variant mb-1">
          {payload.description}
        </p>
        <p className="text-[11px] text-secondary mb-3">
          {payload.connector}.{payload.action} · Confidence:{' '}
          <span
            className={
              payload.confidence >= 0.5 ? 'text-tertiary' : 'text-error'
            }
          >
            {payload.confidence?.toFixed(2)}
          </span>
        </p>

        {/* JSON payload */}
        <pre
          className="bg-surface-container-lowest rounded-lg p-3 font-mono text-[11px] text-on-surface-variant max-h-[200px] overflow-y-auto mb-4 border-[0.5px] border-outline-variant"
          id="approval-json-payload"
        >
          {JSON.stringify(payload.params, null, 2)}
        </pre>

        {/* Error display */}
        {error && (
          <p className="text-error text-[11px] mb-3">{error}</p>
        )}

        {/* Actions */}
        <button
          onClick={approve}
          disabled={loading}
          className="w-full bg-primary text-on-primary rounded-lg font-bold text-[13px] py-2.5 mb-2 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          id="approve-btn"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              Approving...
            </span>
          ) : (
            'APPROVE'
          )}
        </button>

        <div className="flex gap-2">
          <button
            onClick={skip}
            disabled={loading}
            className="flex-1 border-[0.5px] border-outline-variant bg-transparent rounded-lg text-[13px] font-bold text-on-surface-variant py-2 hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            id="skip-btn"
          >
            Skip
          </button>
          <button
            onClick={abort}
            disabled={loading}
            className="flex-1 border-[0.5px] border-outline-variant bg-transparent rounded-lg text-[13px] font-bold text-error py-2 hover:bg-surface-container-highest transition-colors disabled:opacity-50"
            id="abort-btn"
          >
            Abort
          </button>
        </div>
      </div>
    </div>
  );
}
