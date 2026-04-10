import { useMemo } from 'react';
import useWorkflowStore from '../../store/workflowStore';

/**
 * Manually syntax-highlight JSON without external libraries.
 * Keys → primary, strings → green, numbers → tertiary, booleans → tertiary, null → secondary.
 */
function highlightJSON(obj) {
  if (!obj) return '';
  const raw = JSON.stringify(obj, null, 2);

  // Order matters: keys first, then string values, then numbers/booleans/null
  const highlighted = raw
    // Keys (quoted strings followed by colon)
    .replace(
      /("(?:[^"\\]|\\.)*")(\s*:)/g,
      '<span class="text-primary">$1</span>$2'
    )
    // String values (quoted strings NOT followed by colon — already handled keys above)
    .replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      (match, p1) => `: <span class="text-success">${p1}</span>`
    )
    // Numbers
    .replace(
      /:\s*(-?\d+\.?\d*)/g,
      (match, p1) => `: <span class="text-tertiary">${p1}</span>`
    )
    // Booleans
    .replace(
      /:\s*(true|false)/g,
      (match, p1) => `: <span class="text-tertiary">${p1}</span>`
    )
    // Null
    .replace(
      /:\s*(null)/g,
      (match, p1) => `: <span class="text-secondary">${p1}</span>`
    );

  return highlighted;
}

/**
 * JSON tab — formatted, syntax-highlighted DAG JSON.
 */
export default function JsonTab() {
  const currentDAG = useWorkflowStore((s) => s.currentDAG);

  const html = useMemo(() => highlightJSON(currentDAG), [currentDAG]);

  if (!currentDAG) {
    return (
      <div className="p-4 text-center">
        <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-2">
          data_object
        </span>
        <p className="text-[11px] text-secondary">
          DAG JSON will appear here after planning
        </p>
      </div>
    );
  }

  return (
    <div id="json-tab" className="p-3">
      <pre
        className="bg-surface-container-lowest rounded-lg p-3 font-mono text-[11px] text-on-surface-variant overflow-x-auto whitespace-pre border-[0.5px] border-outline-variant"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
