import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

/**
 * Terminal log lines with staggered typewriter reveal.
 * Content is NOT changed — only presentation is enhanced.
 */
function TerminalBlock() {
  const lines = [
    { text: '> Initializing MCP runtime...', color: '#6C757D', delay: 0 },
    { text: '✓ GitHub connector: ACTIVE', color: '#28A745', delay: 600 },
    { text: '✓ Slack connector: ACTIVE', color: '#28A745', delay: 1100 },
    { text: '⚠ Jira connector: CHECKING', color: '#FFBF00', delay: 1600 },
    { text: '> Loading workflow engine...', color: '#6C757D', delay: 2100 },
  ];

  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const timers = lines.map((_, i) =>
      setTimeout(() => setVisibleCount(i + 1), lines[i].delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="mt-6 rounded-lg p-4 font-mono text-[11px] leading-[1.8]"
      style={{
        background: '#0A0A0A',
        border: '0.5px solid rgba(194, 168, 120, 0.12)',
      }}
    >
      {lines.map((line, i) => (
        <p
          key={i}
          className="terminal-line"
          style={{
            color: line.color,
            animationDelay: `${line.delay}ms`,
            display: visibleCount > i ? 'block' : 'none',
          }}
        >
          {line.text}
        </p>
      ))}

      {/* Awaiting auth with blinking cursor — always visible */}
      <p
        className="terminal-line"
        style={{
          color: '#6C757D',
          animationDelay: '2500ms',
          display: visibleCount >= lines.length ? 'block' : 'none',
        }}
      >
        &gt; Awaiting authentication...
        <span
          className="ml-0.5 inline-block"
          style={{
            color: '#C2A878',
            animation: 'blink 1s step-end infinite',
          }}
        >
          █
        </span>
      </p>
    </div>
  );
}

/**
 * Login page — pre-auth gate with split-panel layout.
 * Left: brand + terminal animation. Right: login form.
 * No app shell (TopBar/Sidebar/RightPanel) rendered.
 * @param {{ onLoginSuccess: () => void }} props
 */
export default function Login({ onLoginSuccess, onGoToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setAuthError(null);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.token) {
        localStorage.setItem('mcp_token', data.token);
      }
      onLoginSuccess();
    } catch (err) {
      if (err.response?.status === 401) {
        setAuthError('Invalid credentials. Check your email and try again.');
      } else {
        setAuthError('Connection failed. Retry or contact your admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page-enter flex h-screen w-screen overflow-hidden font-sans"
      style={{ background: '#0D0D0D' }}
    >

      {/* ═══ LEFT PANEL — Brand / Terminal ═══ */}
      <div
        className="hidden md:flex flex-col justify-between w-[60%] h-full p-12"
        style={{ background: '#141413' }}
      >
        {/* Brand block */}
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ color: '#C2A878', letterSpacing: '0.25em' }}
          >
            Agentic Infrastructure
          </p>
          <h1
            className="text-[38px] font-semibold leading-tight mt-3"
            style={{
              color: '#EDE7DF',
              fontFamily: "'Playfair Display', serif",
            }}
          >
            Agentic workflow<br />execution.
          </h1>

          {/* Terminal block — content unchanged, presentation enhanced */}
          <TerminalBlock />
        </div>

        {/* Version */}
        <p className="text-[10px]" style={{ color: '#6C757D' }}>
          v1.0.4-stable
        </p>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div
        className="flex-1 flex items-center justify-center px-6 md:px-12"
        style={{ background: '#0D0D0D' }}
      >
        <div className="w-full max-w-[400px]">

          {/* Header */}
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ color: '#C2A878', letterSpacing: '0.25em' }}
          >
            MCP Gateway
          </p>
          <h2
            className="text-[16px] font-bold mt-2"
            style={{ color: '#EDE7DF' }}
          >
            Sign in to continue
          </h2>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-8" id="login-form">

            {/* Email */}
            <div>
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: '#C1C6D7' }}
              >
                Workspace Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@company.com"
                className="login-input-enhanced w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={{
                  background: '#0A0A0A',
                  color: '#EDE7DF',
                  border: `0.5px solid ${authError ? '#DC3545' : '#2A2A2A'}`,
                }}
                id="login-email"
                autoComplete="email"
              />
              {/* Error */}
              {authError && (
                <p
                  className="mt-1.5 text-[11px] flex items-center gap-1"
                  style={{ color: '#DC3545' }}
                >
                  <span>✗</span> {authError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: '#C1C6D7' }}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[11px] hover:underline"
                  style={{ color: '#C2A878' }}
                  tabIndex={0}
                >
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••••••"
                className="login-input-enhanced w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={{
                  background: '#0A0A0A',
                  color: '#EDE7DF',
                  border: '0.5px solid #2A2A2A',
                }}
                id="login-password"
                autoComplete="current-password"
              />
            </div>

            {/* Remember me */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="login-checkbox-enhanced"
                id="login-remember"
              />
              <label
                htmlFor="login-remember"
                className="text-[11px] cursor-pointer select-none"
                style={{ color: '#C1C6D7' }}
              >
                Keep me signed in
              </label>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn-primary w-full h-[36px] rounded-lg font-bold text-[13px] mt-6 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: '#C2A878',
                color: '#0D0D0D',
                border: 'none',
              }}
              id="login-submit-btn"
            >
              {loading ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'spin 0.7s linear infinite' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#0D0D0D"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="15.7 47.1"
                  />
                </svg>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mt-6 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full"
                style={{ borderTop: '0.5px solid #2A2A2A' }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-2 text-[11px] uppercase"
                style={{ background: '#0D0D0D', color: '#6C757D' }}
              >
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO button */}
          <button
            type="button"
            disabled={loading}
            className="login-btn-secondary w-full h-[36px] rounded-lg text-[13px] font-sans flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'transparent',
              color: '#EDE7DF',
              border: '0.5px solid #2A2A2A',
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#1A1A19'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            id="login-sso-btn"
          >
            Continue with SSO
          </button>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-[11px]" style={{ color: '#6C757D' }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onGoToSignup}
                className="hover:underline bg-transparent border-none cursor-pointer p-0"
                style={{ color: '#C2A878', font: 'inherit' }}
              >
                Sign up
              </button>
            </p>
            <p className="text-[10px] mt-2" style={{ color: '#414755' }}>
              Tokens stored in secure enclave. Not transmitted.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
