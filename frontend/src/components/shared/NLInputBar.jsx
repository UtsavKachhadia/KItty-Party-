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
        <div className="absolute top-[-80px] left-0 right-0 p-4 rounded-lg border shadow-lg z-10 flex flex-col gap-3" style={{ background: '#e8e2d8', borderColor: '#d0c9bc', fontFamily: "'DM Sans', sans-serif" }}>
          <p className="text-[12px] font-semibold" style={{ color: '#1a1410', fontFamily: "'JetBrains Mono', monospace" }}>Is this for yourself or someone else?</p>
          {!isThirdParty ? (
            <div className="flex gap-2">
              <button 
                onClick={() => submitClarification('SELF')}
                className="px-4 py-2 text-[12px] rounded font-medium transition-colors"
                style={{ background: '#1a1410', color: '#f0ece0', fontFamily: "'DM Sans', sans-serif" }}
              >
                For Me
              </button>
              <button 
                onClick={() => setIsThirdParty(true)}
                className="px-4 py-2 text-[12px] rounded font-medium transition-colors"
                style={{ background: 'transparent', color: '#1a1410', border: '1px solid #d0c9bc', fontFamily: "'DM Sans', sans-serif" }}
              >
                For Someone Else
              </button>
              <button 
                onClick={() => setIsClarifying(false)}
                className="ml-auto text-[11px] hover:underline"
                style={{ color: '#7a7060', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
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
                className="px-3 py-2 text-[12px] flex-1 rounded outline-none"
                style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc', fontFamily: "'DM Sans', sans-serif" }}
              />
              <button 
                onClick={() => submitClarification('THIRD_PARTY')}
                className="px-4 py-2 text-[12px] rounded font-medium transition-colors"
                style={{ background: '#1a1410', color: '#f0ece0', fontFamily: "'DM Sans', sans-serif" }}
              >
                Confirm
              </button>
              <button 
                onClick={() => setIsThirdParty(false)}
                className="text-[11px] hover:underline"
                style={{ color: '#7a7060', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Back
              </button>
            </div>
          )}
        </div>
      )}

      <div
        className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
          shaking ? 'animate-shake' : ''
        }`}
        style={{ background: '#f0ece0', borderColor: isClarifying ? '#c9a84c' : '#d0c9bc' }}
      >
        <span className="material-symbols-outlined text-[20px]" style={{ color: '#7a7060' }}>
          search
        </span>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled || isClarifying}
          placeholder="Describe your workflow..."
          className="flex-1 rounded-lg px-4 py-3 text-[14px] outline-none transition-colors disabled:opacity-50"
          style={{
            background: '#dad3bd',
            color: '#1a1410',
            border: '1px solid #d0c9bc',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onFocus={(e) => { e.target.style.borderColor = '#3d3628'; }}
          onBlur={(e) => { e.target.style.borderColor = '#d0c9bc'; }}
          id="workflow-input"
        />

        <button
          onClick={() => handleSubmit()}
          disabled={isDisabled || isClarifying}
          className={`rounded-lg font-bold text-[13px] px-6 py-3 transition-all flex items-center gap-2 ${
            isLoading || isRunning || isClarifying
              ? 'opacity-70 cursor-not-allowed'
              : 'hover:opacity-90 active:scale-[0.97]'
          }`}
          style={{
            background: '#1a1410',
            color: '#f0ece0',
            border: 'none',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          id="workflow-run-btn"
        >
          {isLoading && (
            <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(240, 236, 224, 0.3)', borderTopColor: '#f0ece0' }} />
          )}
          {buttonLabel}
        </button>
      </div>

      {error && (
        <p className="text-[11px] mt-2 px-2" style={{ color: '#c0392b', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
      )}
    </div>
  );
}
