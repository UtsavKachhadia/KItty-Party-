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
      className="w-[200px] bg-surface-container-low border-r border-[0.5px] border-outline-variant/20 flex flex-col flex-shrink-0 overflow-hidden select-none"
    >
      {/* Brand + version */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-[0.5px] border-outline-variant/10">
        <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[14px] text-primary">
            bolt
          </span>
        </div>
        <span className="text-[13px] font-bold text-on-surface">
          MCP Gateway
        </span>
        <span className="text-[11px] text-secondary ml-auto">v1.0</span>
      </div>

      {/* Navigation */}
      <nav className="px-1 pt-2 flex flex-col gap-0.5">
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
        <span className="px-3 py-2 text-[11px] font-bold text-secondary uppercase tracking-wider">
          History
        </span>
        <div className="flex-1 overflow-y-auto px-1">
          {history.length === 0 ? (
            <p className="text-secondary text-[11px] px-3 py-2">
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
      <div className="border-t border-[0.5px] border-outline-variant/10 px-1 py-1">
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
