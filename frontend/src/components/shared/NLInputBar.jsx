import { useState } from 'react';
import useWorkflow from '../../hooks/useWorkflow';

/**
 * Full-width natural language text input + RUN button.
 * Handles submit, loading, and disabled states.
 */
export default function NLInputBar() {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const [shaking, setShaking] = useState(false);
  const { submitWorkflow, canSubmit, status } = useWorkflow();

  const [isClarifying, setIsClarifying] = useState(false);
  const [isThirdParty, setIsThirdParty] = useState(false);
  const [targetUsername, setTargetUsername] = useState('');

  const isLoading = status === 'planning';
  const isRunning = ['running', 'awaiting_approval'].includes(status);
  const isDisabled = !canSubmit && !isClarifying;

  const handleSubmit = async (executionContext = null) => {
    setError(null);

    const textToSubmit = inputValue.trim();
    if (!textToSubmit) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      return;
    }

    if (!canSubmit) return;

    try {
      const response = await submitWorkflow(textToSubmit, executionContext);
      
      // Handle the new intent clarification standard
      if (response && response.status === 'NEEDS_CLARIFICATION') {
        setIsClarifying(true);
      } else {
        // Reset state on success
        setIsClarifying(false);
        setIsThirdParty(false);
        setTargetUsername('');
        setInputValue('');
      }
    } catch (err) {
      // Sometimes APIs throw 400s or 422s with the exact status if they are structured as errors
      if (err.response?.data?.status === 'NEEDS_CLARIFICATION') {
        setIsClarifying(true);
      } else {
        setError(err.response?.data?.error || err.message || 'Something went wrong');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isClarifying) handleSubmit();
    }
  };

  const submitClarification = (type) => {
    if (type === 'THIRD_PARTY' && !targetUsername.trim()) {
      return setError('Please enter a target username');
    }
    
    // Re-submit with context
    handleSubmit({
      executionType: type,
      targetUserId: targetUsername.trim(), // mapping username to ID isn't directly supported unless user search API is built in, sending string for now
    });
  };

  const buttonLabel = isLoading
    ? 'Planning...'
    : isRunning
      ? 'Running...'
      : 'RUN';

  return (
    <div className="w-full relative" id="nl-input-bar">
      {isClarifying && (
        <div className="absolute top-[-60px] left-0 right-0 p-3 bg-surface-container-high rounded-lg border-[0.5px] border-primary shadow-lg z-10 flex flex-col gap-2">
          <p className="text-[12px] font-bold text-on-surface">Is this for yourself or someone else?</p>
          {!isThirdParty ? (
            <div className="flex gap-2">
              <button 
                onClick={() => submitClarification('SELF')}
                className="bg-primary/20 hover:bg-primary/40 text-primary px-3 py-1 text-[12px] rounded"
              >
                For Me
              </button>
              <button 
                onClick={() => setIsThirdParty(true)}
                className="bg-secondary/20 hover:bg-secondary/40 text-on-surface px-3 py-1 text-[12px] rounded"
              >
                For Someone Else
              </button>
              <button 
                onClick={() => setIsClarifying(false)}
                className="ml-auto text-secondary text-[11px] hover:text-on-surface"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Target Username or ID"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                className="bg-surface-container-lowest border-[0.5px] border-outline-variant rounded px-2 py-1 text-[12px] text-on-surface flex-1"
              />
              <button 
                onClick={() => submitClarification('THIRD_PARTY')}
                className="bg-primary text-on-primary px-3 py-1 text-[12px] rounded hover:brightness-110"
              >
                Confirm
              </button>
              <button 
                onClick={() => setIsThirdParty(false)}
                className="text-secondary text-[11px] hover:text-on-surface"
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`flex items-center gap-2 p-2 bg-surface-container-high rounded-lg border-[0.5px] ${isClarifying ? 'border-primary' : 'border-outline-variant'} ${
          shaking ? 'animate-shake' : ''
        }`}
      >
        <span className="material-symbols-outlined text-[20px] text-secondary ml-1">
          search
        </span>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled || isClarifying}
          placeholder="Describe your workflow..."
          className="flex-1 bg-surface-container-lowest border-[0.5px] border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface font-mono placeholder:text-secondary focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          id="workflow-input"
        />

        <button
          onClick={() => handleSubmit()}
          disabled={isDisabled || isClarifying}
          className={`rounded-lg font-bold text-[13px] px-5 py-2 transition-all flex items-center gap-2 ${
            isLoading || isRunning || isClarifying
              ? 'bg-primary/60 text-on-primary cursor-not-allowed'
              : 'bg-primary text-on-primary hover:brightness-110 active:scale-[0.97]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          id="workflow-run-btn"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
          )}
          {buttonLabel}
        </button>
      </div>

      {error && (
        <p className="text-error text-[11px] mt-1.5 px-2">{error}</p>
      )}
    </div>
  );
}
