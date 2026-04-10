/**
 * Horizontal confidence indicator bar.
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
    </div>
  );
}
