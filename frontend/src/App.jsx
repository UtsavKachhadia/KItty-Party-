import { useState } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AppShell from './AppShell';

/**
 * Root application component with auth gate.
 * Shows Login or Signup page when unauthenticated, full AppShell when authed.
 */
export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem('mcp_token'));
  const [page, setPage] = useState('login'); // 'login' | 'signup'

  if (!authed) {
    if (page === 'signup') {
      return (
        <Signup
          onSignupSuccess={() => setAuthed(true)}
          onGoToLogin={() => setPage('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={() => setAuthed(true)}
        onGoToSignup={() => setPage('signup')}
      />
    );
  }

  return <AppShell onLogout={() => { localStorage.removeItem('mcp_token'); setAuthed(false); setPage('login'); }} />;
}
