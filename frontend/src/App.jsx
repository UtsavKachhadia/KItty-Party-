import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AppShell from './AppShell';
import api from './lib/api';

/**
 * Root application component with auth gate.
 * Verifies existing tokens on mount to handle stale sessions.
 * Routes between Login, Signup, and authenticated AppShell.
 */
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState('login'); // 'login' | 'signup'

  // Verify existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('mcp_token');
    if (!token) {
      setChecking(false);
      return;
    }

    api.get('/auth/me')
      .then(() => {
        setAuthed(true);
        setChecking(false);
      })
      .catch(() => {
        localStorage.removeItem('mcp_token');
        setChecking(false);
      });
  }, []);

  // Show loading state while verifying token
  if (checking) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ background: '#131313', color: '#6C757D', fontFamily: 'monospace', fontSize: '13px' }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚡</div>
          Verifying session...
        </div>
      </div>
    );
  }

  // Unauthenticated — show Login or Signup
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

  // Authenticated — show AppShell
  return (
    <AppShell
      onLogout={() => {
        localStorage.removeItem('mcp_token');
        setAuthed(false);
        setPage('login');
      }}
    />
  );
}
