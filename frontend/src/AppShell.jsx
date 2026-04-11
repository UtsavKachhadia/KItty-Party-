import useSocket from './hooks/useSocket';
import useUIStore from './store/uiStore';
import TopBar from './components/shared/TopBar';
import Sidebar from './components/sidebar/Sidebar';
import StatusBar from './components/shared/StatusBar';
import WorkflowPage from './pages/WorkflowPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import ApprovalModal from './components/modals/ApprovalModal';

import Chatbot from './components/shared/Chatbot';

/**
 * Authenticated application shell.
 * Composes: TopBar + Sidebar + active page + StatusBar + ApprovalModal overlay.
 * Only rendered after successful login.
 */
export default function AppShell({ onLogout }) {
  // Initialize socket connection on mount
  useSocket();

  const activePage = useUIStore((s) => s.activePage);
  const approvalOpen = useUIStore((s) => s.approvalModal.open);

  const pages = {
    workflow: <WorkflowPage />,
    history: <HistoryPage />,
    settings: <SettingsPage />,
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface font-sans text-[13px] text-on-surface flex flex-col">
      {/* Top bar */}
      <TopBar onLogout={onLogout} />

      {/* Body: sidebar + main content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden bg-surface">
          {pages[activePage]}
        </main>
      </div>

      {/* Status bar */}
      <StatusBar />
      
      {/* Floating Chatbot Widget */}
      <Chatbot />

      {/* Approval modal overlay */}
      {approvalOpen && <ApprovalModal />}
    </div>
  );
}
