import { useState, useEffect } from 'react';
import useWorkflow from '../../hooks/useWorkflow';
import useWorkflowStore from '../../store/workflowStore';

export default function NLInputBar() {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);
  const [shaking, setShaking] = useState(false);
  const { submitWorkflow, canSubmit, status, fetchHistory } = useWorkflow();
  const history = useWorkflowStore(s => s.history);

  const [executionMode, setExecutionMode] = useState('SELF'); // 'SELF' | 'THIRD_PARTY'
  const [targetUsername, setTargetUsername] = useState('');
  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    fetchHistory();
    const stored = JSON.parse(localStorage.getItem('ki_recent_targets') || '[]');
    setRecentUsers(stored);
  }, []);

  const isLoading = status === 'planning';
  const isRunning = ['running', 'awaiting_approval'].includes(status);
  const isDisabled = !canSubmit;

  const saveRecentUser = (username) => {
    if (!username) return;
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    const updated = [clean, ...recentUsers.filter(u => u !== clean)].slice(0, 5);
    setRecentUsers(updated);
    localStorage.setItem('ki_recent_targets', JSON.stringify(updated));
  };

  const handleSubmit = async () => {
    setError(null);

    const textToSubmit = inputValue.trim();
    if (!textToSubmit) {
      setShaking(true);
      setTimeout(() => setShaking(false), 300);
      return;
    }

    if (executionMode === 'THIRD_PARTY' && !targetUsername.trim()) {
      return setError('Please enter a target username or email to execute this for.');
    }

    if (!canSubmit) return;

    try {
      const executionContext = {
        type: executionMode,
        targetUsername: executionMode === 'THIRD_PARTY' ? targetUsername.trim() : undefined
      };

      const response = await submitWorkflow(textToSubmit, executionContext);
      
      if (executionMode === 'THIRD_PARTY') {
        saveRecentUser(targetUsername);
      }

      setInputValue('');
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

  const buttonLabel = isLoading ? 'Planning...' : isRunning ? 'Running...' : 'RUN';

  const uniqueCommands = history
    ? history.map(h => h.userInput).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5)
    : [];

  return (
    <div className="w-full relative" id="nl-input-bar">
      <div
        className={`flex flex-col gap-3 p-4 rounded-lg border transition-colors shadow-sm ${
          shaking ? 'animate-shake' : ''
        }`}
        style={{ background: '#f0ece0', borderColor: '#d0c9bc' }}
      >
        {/* Top: Workflow Input */}
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[20px]" style={{ color: '#7a7060' }}>
            auto_awesome
          </span>
          <input
            type="text"
            list="recent-commands"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isDisabled}
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
          <datalist id="recent-commands">
            {uniqueCommands.map(cmd => <option key={cmd} value={cmd} />)}
          </datalist>
        </div>

        {/* Bottom Panel: Execution Mode & Run */}
        <div className="flex items-center justify-between border-t pt-3" style={{ borderColor: 'rgba(208, 201, 188, 0.5)' }}>
          <div className="flex items-center gap-3 pl-1">
            <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#7a7060', fontFamily: "'DM Sans', sans-serif" }}>Target:</span>
            
            <div className="flex rounded overflow-hidden" style={{ border: '1px solid #d0c9bc' }}>
              <button
                onClick={() => setExecutionMode('SELF')}
                className="px-4 py-1.5 text-[12px] font-bold transition-colors"
                style={{
                  background: executionMode === 'SELF' ? '#1a1410' : '#dad3bd',
                  color: executionMode === 'SELF' ? '#f0ece0' : '#7a7060',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                For Me
              </button>
              <button
                onClick={() => setExecutionMode('THIRD_PARTY')}
                className="px-4 py-1.5 text-[12px] font-bold transition-colors"
                style={{
                  background: executionMode === 'THIRD_PARTY' ? '#c9a84c' : '#dad3bd',
                  color: executionMode === 'THIRD_PARTY' ? '#1a1410' : '#7a7060',
                  borderLeft: '1px solid #d0c9bc',
                  fontFamily: "'DM Sans', sans-serif"
                }}
              >
                For Someone Else
              </button>
            </div>

            {executionMode === 'THIRD_PARTY' && (
              <div className="flex items-center">
                <input
                  type="text"
                  list="recent-targets"
                  placeholder="Email or Username"
                  value={targetUsername}
                  onChange={e => setTargetUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="rounded px-3 py-1.5 text-[12px] w-[200px] outline-none transition-colors"
                  style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc', fontFamily: "'DM Sans', sans-serif" }}
                  onFocus={(e) => { e.target.style.borderColor = '#1a1410'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#d0c9bc'; }}
                />
                <datalist id="recent-targets">
                  {recentUsers.map(u => <option key={u} value={`@${u}`} />)}
                </datalist>
              </div>
            )}
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={isDisabled}
            className={`rounded-lg font-bold text-[13px] px-8 py-2.5 transition-all flex items-center gap-2 ${
              isLoading || isRunning
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
      </div>

      {error && (
        <p className="text-[11px] mt-2 px-2" style={{ color: '#c0392b', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
      )}
    </div>
  );
}
