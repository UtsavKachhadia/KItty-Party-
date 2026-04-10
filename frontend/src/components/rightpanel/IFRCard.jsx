import { useState, useEffect } from 'react';
import useWorkflowStore from '../../store/workflowStore';

/**
 * IFR Engine metrics card pinned at bottom of right panel.
 * Shows simulated latency and token throughput metrics.
 */
export default function IFRCard() {
  const status = useWorkflowStore((s) => s.status);
  const [latency, setLatency] = useState(0);
  const [tokensPerSec, setTokensPerSec] = useState(0);
  const [throughput, setThroughput] = useState(0);

  const isActive = ['planning', 'running', 'awaiting_approval'].includes(
    status
  );

  // Simulate metrics when active
  useEffect(() => {
    if (!isActive) {
      setLatency(0);
      setTokensPerSec(0);
      setThroughput(0);
      return;
    }

    const interval = setInterval(() => {
      setLatency(Math.floor(80 + Math.random() * 120));
      setTokensPerSec(Math.floor(280 + Math.random() * 140));
      setThroughput(Math.min(100, throughput + Math.random() * 15));
    }, 800);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div
      id="ifr-card"
      className="bg-surface-container-lowest border-[0.5px] border-outline-variant rounded-lg p-3 m-3 flex-shrink-0"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px] text-tertiary">
          bolt
        </span>
        <div>
          <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider block leading-tight">
            IFR Engine
          </span>
          <span className="text-[11px] text-secondary leading-tight">
            Real-time Inference
          </span>
        </div>
        {isActive && (
          <span className="ml-auto w-[6px] h-[6px] rounded-full bg-tertiary animate-pulse" />
        )}
      </div>

      {/* Metrics */}
      <div className="flex justify-between text-[11px] mt-2">
        <span className="text-secondary">Latency</span>
        <span className="text-on-surface font-mono tabular-nums">
          {isActive ? `${latency}ms` : '—'}
        </span>
      </div>
      <div className="flex justify-between text-[11px] mt-1">
        <span className="text-secondary">Tokens/s</span>
        <span className="text-on-surface font-mono tabular-nums">
          {isActive ? tokensPerSec : '—'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-surface-container-high rounded-full overflow-hidden mt-2.5">
        <div
          className="h-full bg-tertiary rounded-full transition-all duration-700"
          style={{ width: `${isActive ? Math.min(throughput, 100) : 0}%` }}
        />
      </div>
    </div>
  );
}
