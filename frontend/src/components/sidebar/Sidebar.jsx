import { useEffect } from 'react';
import NavItem from './NavItem';
import HistoryItem from './HistoryItem';
import useUIStore from '../../store/uiStore';
import useWorkflowStore from '../../store/workflowStore';
import useWorkflow from '../../hooks/useWorkflow';

/**
 * 200px left sidebar with navigation, workflow history, and settings.
 */
export default function Sidebar() {
  const activePage = useUIStore((s) => s.activePage);
  const setActivePage = useUIStore((s) => s.setActivePage);
  const history = useWorkflowStore((s) => s.history);
  const { fetchHistory } = useWorkflow();

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <aside
      id="sidebar"
      className="w-[220px] flex flex-col flex-shrink-0 overflow-hidden select-none"
      style={{ background: '#181410', borderRight: '1px solid #2e2820' }}
    >
      {/* Brand + version */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b" style={{ borderColor: '#2e2820' }}>
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: '#c9a84c' }}>
          <span className="text-[13px] font-bold" style={{ color: '#0d0b09' }}>M</span>
        </div>
        <span className="text-[13px] font-semibold" style={{ color: '#f0ece0', fontFamily: "'DM Sans', sans-serif" }}>
          MCP Gateway
        </span>
        <span className="text-[10px] ml-auto" style={{ color: '#9a9080', fontFamily: "'JetBrains Mono', monospace" }}>v1.0</span>
      </div>

      {/* Navigation */}
      <nav className="px-2 pt-3 flex flex-col gap-0.5">
        <NavItem
          icon="dashboard"
          label="Dashboard"
          active={activePage === 'dashboard'}
          onClick={() => setActivePage('dashboard')}
        />
        <NavItem
          icon="account_tree"
          label="Workflow Engine"
          active={activePage === 'workflow'}
          onClick={() => setActivePage('workflow')}
        />
        <NavItem
          icon="history"
          label="Execution Logs"
          active={activePage === 'history'}
          onClick={() => setActivePage('history')}
        />
        <NavItem
          icon="inbox"
          label="Requests"
          active={activePage === 'requests'}
          onClick={() => setActivePage('requests')}
        />
        <NavItem
          icon="extension"
          label="Integrations"
          active={activePage === 'integrations'}
          onClick={() => setActivePage('integrations')}
        />
      </nav>

      {/* History section */}
      <div className="mt-4 flex flex-col flex-1 overflow-hidden">
        <span className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#4a4238', fontFamily: "'JetBrains Mono', monospace" }}>
          History
        </span>
        <div className="flex-1 overflow-y-auto px-2">
          {history.length === 0 ? (
            <p className="text-[12px] px-3 py-2" style={{ color: '#5a5048', fontFamily: "'DM Sans', sans-serif" }}>
              No recent runs
            </p>
          ) : (
            history.map((run) => (
              <HistoryItem key={run.runId} run={run} />
            ))
          )}
        </div>
      </div>

      {/* Settings pinned bottom */}
      <div className="border-t px-2 py-1" style={{ borderColor: '#2e2820' }}>
        <NavItem
          icon="settings"
          label="Settings"
          active={activePage === 'settings'}
          onClick={() => setActivePage('settings')}
        />
      </div>
    </aside>
  );
}
