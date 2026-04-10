import { useState } from 'react';
import Login from './pages/Login';
import AppShell from './AppShell';

/**
 * Root application component with auth gate.
 * Shows Login page when unauthenticated, full AppShell when authed.
 */
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('mcp_token'));

  if (!authed) {
    return <Login onLoginSuccess={() => setAuthed(true)} />;
  }

  return <AppShell onLogout={() => { localStorage.removeItem('mcp_token'); setAuthed(false); }} />;
}
