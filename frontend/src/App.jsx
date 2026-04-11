import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AppShell from './AppShell';
import api from './lib/api';

/**
 * Root application component with auth gate.
 */
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('mcp_token'));
  const [checking, setChecking] = useState(!!localStorage.getItem('mcp_token'));

  useEffect(() => {
    const verifyToken = async () => {
      if (!authed) {
        setChecking(false);
        return;
      }
      try {
        await api.get('/auth/me');
        setChecking(false);
      } catch (err) {
        localStorage.removeItem('mcp_token');
        setAuthed(false);
        setChecking(false);
      }
    };
    verifyToken();
  }, [authed]);

  if (checking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#131313] text-[#E5E2E1] font-mono text-sm">
        Authenticating session...
      </div>
    );
  }

  if (!authed) {
    return <Login onLoginSuccess={() => setAuthed(true)} />;
  }

  return (
    <AppShell 
      onLogout={() => { 
        localStorage.removeItem('mcp_token'); 
        setAuthed(false); 
      }} 
    />
  );
}
