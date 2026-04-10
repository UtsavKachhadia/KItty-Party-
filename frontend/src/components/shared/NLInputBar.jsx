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

  const isLoading = status === 'planning';
  const isRunning = ['running', 'awaiting_approval'].includes(status);
  const isDisabled = !canSubmit;

  const handleSubmit = async () => {
    setError(null);

    if (!inputValue.trim()) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      return;
    }

    if (!canSubmit) return;

    try {
      await submitWorkflow(inputValue.trim());
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const buttonLabel = isLoading
    ? 'Planning...'
    : isRunning
      ? 'Running...'
      : 'RUN';

  return (
    <div className="w-full" id="nl-input-bar">
      <div
        className={`flex items-center gap-2 p-2 bg-surface-container-high rounded-lg border-[0.5px] border-outline-variant ${
          shaking ? 'animate-shake' : ''
        }`}
      >
        {/* Search icon */}
        <span className="material-symbols-outlined text-[20px] text-secondary ml-1">
          search
        </span>

        {/* Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled && !canSubmit}
          placeholder="Describe your workflow..."
          className="flex-1 bg-surface-container-lowest border-[0.5px] border-outline-variant rounded-lg px-3 py-2 text-[13px] text-on-surface font-mono placeholder:text-secondary focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
          id="workflow-input"
        />

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled && !canSubmit}
          className={`rounded-lg font-bold text-[13px] px-5 py-2 transition-all flex items-center gap-2 ${
            isLoading || isRunning
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

      {/* Error message */}
      {error && (
        <p className="text-error text-[11px] mt-1.5 px-2">{error}</p>
      )}
    </div>
  );
}
