import { useEffect, useRef } from 'react';
import useUIStore from '../../store/uiStore';

/**
 * CONSOLE tab — scrollable monospace log output.
 * Auto-scrolls to bottom on new entries.
 */
export default function ConsoleTab() {
  const consoleLogs = useUIStore((s) => s.consoleLogs);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs.length]);

  if (consoleLogs.length === 0) {
    return (
      <div className="p-4 text-center">
        <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-2">
          terminal
        </span>
        <p className="text-[11px] text-secondary">
          Console output will appear here
        </p>
      </div>
    );
  }

  return (
    <div id="console-tab" className="p-3 font-mono text-[11px] text-on-surface-variant leading-relaxed">
      {consoleLogs.map((line, idx) => (
        <div
          key={idx}
          className={`whitespace-pre-wrap break-all py-0.5 ${
            line.includes('✗')
              ? 'text-error'
              : line.includes('✓')
                ? 'text-success'
                : line.includes('⚠')
                  ? 'text-tertiary'
                  : line.includes('→')
                    ? 'text-primary'
                    : ''
          }`}
        >
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
