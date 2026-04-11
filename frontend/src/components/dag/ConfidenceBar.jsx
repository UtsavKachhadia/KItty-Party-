/**
 * Horizontal confidence indicator bar with info tooltip.
 * Color: green >0.8, yellow 0.5–0.8, red <0.5
 * @param {{ value: number }} props — confidence value between 0 and 1
 */
export default function ConfidenceBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    value > 0.8 ? 'bg-success' : value >= 0.5 ? 'bg-tertiary' : 'bg-error';

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex-1 h-[4px] bg-surface-container-lowest rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-secondary font-mono tabular-nums">
        {(value ?? 0).toFixed(2)}
      </span>
      <ConfidenceInfoIcon />
    </div>
  );
}

/**
 * ℹ icon with CSS-only hover tooltip explaining confidence score calculation.
 * Uses Tailwind group/group-hover — zero React state overhead.
 */
function ConfidenceInfoIcon() {
  return (
    <div className="group relative flex-shrink-0">
      {/* Info icon — inline SVG (Lucide "Info" path) */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-secondary cursor-help transition-colors duration-150 group-hover:text-on-surface"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>

      {/* Tooltip — appears on group hover */}
      <div
        className="
          pointer-events-none
          opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto
          absolute right-0 bottom-full mb-2
          z-50
          rounded-[6px] p-[10px_12px]
          text-[11px] leading-[1.6]
          w-[220px]
        "
        style={{
          background: '#2A2A2A',
          color: '#E5E2E1',
          border: '1px solid #414755',
          transition: 'opacity 150ms ease',
        }}
      >
        <p className="text-[12px] font-bold mb-1.5" style={{ color: '#E5E2E1' }}>
          How is this calculated?
        </p>
        <p className="text-[11px] leading-[1.6]" style={{ color: '#E5E2E1' }}>
          • Starts at 85% base confidence.<br />
          • +10% if the step is simple (no dependencies).<br />
          • −20% if the required connector (e.g. GitHub, Slack) is missing.<br />
          • −15% if the AI attempts an unsupported action.<br />
          • −10% if required parameters are missing.
        </p>
        <p className="mt-2 text-[10px] italic" style={{ color: '#6C757D' }}>
          Scores are averaged with the AI's self-evaluation and kept between 0–100%. Low scores require manual approval.
        </p>
      </div>
    </div>
  );
}

export { ConfidenceInfoIcon };
