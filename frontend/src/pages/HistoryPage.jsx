import { useState, useEffect } from 'react';
import api from '../lib/api';
import AuditLog from '../components/rightpanel/AuditLog';

/**
 * History / Execution Logs page.
 * Left: list of past runs. Right: AuditLog for selected run.
 */
export default function HistoryPage() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/workflow/history')
      .then((res) => {
        const history = res.data.history || [];
        setRuns(history);
        if (history.length > 0) {
          setSelectedRunId(history[0].runId);
        }
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, []);

  const downloadFile = async (url, filename) => {
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const blobURL = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobURL;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobURL);
    } catch (err) {
      console.error('Failed to download file:', err);
      alert('Failed to download file.');
    }
  };

  const statusDot = {
    completed: 'bg-success',
    failed: 'bg-error',
    running: 'bg-primary animate-pulse',
    pending: 'bg-secondary',
  };

  return (
    <div className="flex h-full overflow-hidden" id="history-page" style={{ background: '#f0ece0' }}>
      <div className="w-[320px] flex flex-col overflow-hidden flex-shrink-0" style={{ background: '#f0ece0', borderRight: '1px solid #2e2820' }}>
        <div className="px-4 py-3 flex-shrink-0 flex justify-between items-center" style={{ borderBottom: '1px solid #2e2820' }}>
          <div>
            <h1 className="text-[16px] font-bold" style={{ color: '#1a1410' }}>Execution Logs</h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#7a7060' }}>{runs.length} workflow runs</p>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => downloadFile('/export/history?format=csv', 'history.csv')}
              title="Export All as CSV" 
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
            </button>
            <button 
              onClick={() => downloadFile('/export/history?format=md', 'history.md')}
              title="Export All as Markdown"
              className="text-secondary hover:text-primary transition-colors p-1"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
            </div>
          ) : runs.length === 0 ? (
            <p className="text-secondary text-[11px] p-4 text-center">
              No workflow runs yet
            </p>
          ) : (
            runs.map((run) => (
              <div
                key={run.runId}
                onClick={() => setSelectedRunId(run.runId)}
                className={`px-4 py-3 border-b border-[0.5px] border-outline-variant/10 cursor-pointer transition-colors ${
                  selectedRunId === run.runId
                    ? 'bg-surface-container-highest'
                    : 'hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${
                      statusDot[run.status] || 'bg-secondary'
                    }`}
                  />
                  <span className="text-[13px] text-on-surface font-medium truncate">
                    {run.userInput?.slice(0, 40) || 'Untitled'}
                    {run.userInput?.length > 40 ? '...' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-secondary ml-4">
                  <span>{run.stepsCompleted}/{run.stepsTotal} steps</span>
                  <span>·</span>
                  <span className={run.status === 'failed' ? 'text-error' : ''}>
                    {run.status}
                  </span>
                  {run.startedAt && (
                    <>
                      <span>·</span>
                      <span>
                        {new Date(run.startedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Audit log (right) */}
      <div className="flex-1 overflow-hidden bg-surface-container-low">
        <div className="px-4 py-3 border-b border-[0.5px] border-outline-variant/20 flex-shrink-0 flex justify-between items-center bg-surface">
          <div className="flex flex-col overflow-hidden">
            <h2 className="text-[13px] font-bold text-on-surface">Audit Trail</h2>
            {selectedRunId && (
              <p className="text-[11px] text-secondary font-mono mt-0.5 truncate">
                {selectedRunId}
              </p>
            )}
          </div>
          {selectedRunId && (
            <div className="flex gap-2 flex-shrink-0 items-center">
              <span className="text-[10px] uppercase text-secondary font-bold mr-1">Export</span>
              <button 
                onClick={() => downloadFile(`/export/execution/${selectedRunId}?format=csv`, `execution-${selectedRunId}.csv`)}
                className="px-2.5 py-1 text-[11px] font-bold rounded border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                CSV
              </button>
              <button 
                onClick={() => downloadFile(`/export/execution/${selectedRunId}?format=md`, `execution-${selectedRunId}.md`)}
                className="px-2.5 py-1 text-[11px] font-bold rounded border border-outline-variant text-secondary hover:text-on-surface hover:bg-surface-container-highest transition-colors"
              >
                MD
              </button>
            </div>
          )}
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto">
          <AuditLog runId={selectedRunId} />
        </div>
      </div>
    </div>
  );
}
