import { useState, useEffect } from 'react';
import api from '../../lib/api';

/**
 * Audit log viewer — collapsible list of API call entries for a given run.
 * @param {{ runId: string }} props
 */
export default function AuditLog({ runId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    api
      .get(`/audit/${runId}`)
      .then((res) => setLogs(res.data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [runId]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
        <p className="text-[11px] text-secondary mt-2">Loading audit log...</p>
      </div>
    );
  }

  if (!runId) {
    return (
      <div className="p-4 text-center">
        <span className="material-symbols-outlined text-[32px] text-outline-variant/40 block mb-2">
          receipt_long
        </span>
        <p className="text-[11px] text-secondary">
          Select a workflow run to view its audit log
        </p>
      </div>
    );
  }

  return (
    <div id="audit-log" className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-[11px] text-secondary p-4 text-center">
            No audit entries found
          </p>
        ) : (
          logs.map((entry) => {
            const isExpanded = expanded[entry._id];
            const methodColor =
              entry.action?.startsWith('get') || entry.action?.startsWith('list')
                ? 'text-success'
                : 'text-primary';
            const statusColor = entry.success ? 'text-success' : 'text-error';

            return (
              <div
                key={entry._id}
                className="px-3 py-2.5 border-b border-[0.5px] border-outline-variant/10 cursor-pointer hover:bg-surface-container-highest transition-colors"
                onClick={() => toggleExpanded(entry._id)}
              >
                {/* Summary row */}
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-bold ${methodColor} flex-shrink-0 uppercase`}
                  >
                    {entry.connector}
                  </span>
                  <span className="text-[11px] text-on-surface-variant truncate flex-1">
                    {entry.action}
                  </span>
                  <span
                    className={`text-[11px] font-mono ${statusColor} flex-shrink-0`}
                  >
                    {entry.success ? 'OK' : 'ERR'}
                  </span>
                  <span className="text-[11px] text-secondary font-mono tabular-nums flex-shrink-0">
                    {entry.durationMs}ms
                  </span>
                  <span className="material-symbols-outlined text-[14px] text-secondary">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <div>
                      <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                        Request
                      </span>
                      <pre className="bg-surface-container-lowest rounded-lg p-3 font-mono text-[11px] text-on-surface-variant overflow-x-auto whitespace-pre border-[0.5px] border-outline-variant">
                        {JSON.stringify(entry.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-secondary uppercase tracking-wider block mb-1">
                        Response
                      </span>
                      <pre className="bg-surface-container-lowest rounded-lg p-3 font-mono text-[11px] text-on-surface-variant overflow-x-auto whitespace-pre border-[0.5px] border-outline-variant">
                        {JSON.stringify(entry.response, null, 2)}
                      </pre>
                    </div>
                    {entry.errorMessage && (
                      <p className="text-[11px] text-error">
                        Error: {entry.errorMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Export button */}
      {logs.length > 0 && (
        <div className="p-3 border-t border-[0.5px] border-outline-variant/10 flex-shrink-0">
          <button
            onClick={exportJSON}
            className="w-full border-[0.5px] border-outline-variant bg-surface-container-highest text-[11px] font-bold uppercase px-3 py-1.5 rounded-lg hover:bg-surface-container-high transition-colors text-on-surface-variant"
            id="export-audit-btn"
          >
            Export JSON
          </button>
        </div>
      )}
    </div>
  );
}
