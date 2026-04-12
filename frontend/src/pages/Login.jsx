import { useState } from 'react';
import api from '../lib/api';

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
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#1a1410', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ═══ LEFT PANEL — Brand / Terminal ═══ */}
      <div
        className="hidden md:flex flex-col justify-between w-[55%] h-full p-[60px]"
        style={{ background: '#1a1410' }}
      >
        {/* Background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(201, 168, 76, 0.06) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        {/* Brand block */}
        <div className="flex-1 flex flex-col justify-center relative z-10">
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: '#9a9080', letterSpacing: '0.2em', fontFamily: "'JetBrains Mono', monospace" }}
          >
            MCP Gateway
          </p>
          <h1
            className="text-[64px] leading-[1.05] mt-5 font-italic"
            style={{ color: '#f0ece0', fontFamily: "'Playfair Display', serif" }}
          >
            Agentic workflow<br />execution.
          </h1>

          {/* Terminal block */}
          <div
            className="mt-12 rounded-lg p-6 text-[13px] leading-[1.8]"
            style={{ background: '#0d0b09', border: '1px solid #2e2820', maxWidth: '520px', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <p style={{ color: '#9a9080' }}>&gt; Initializing MCP runtime...</p>
            <p style={{ color: '#4ade80' }}>✓ GitHub connector: ACTIVE</p>
            <p style={{ color: '#4ade80' }}>✓ Slack connector: ACTIVE</p>
            <p style={{ color: '#c9a84c' }}>⚠ Jira connector: CHECKING</p>
            <p style={{ color: '#9a9080' }}>&gt; Loading workflow engine...</p>
            <p style={{ color: '#9a9080' }}>
              &gt; Awaiting authentication...
              <span
                className="ml-0.5 inline-block"
                style={{
                  color: '#c9a84c',
                  animation: 'blink 1s step-end infinite',
                }}
              >
                █
              </span>
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-[11px] relative z-10" style={{ color: '#4a4238', letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>
          v1.0.4-stable
        </p>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div
        className="flex-1 flex items-center justify-center px-8 md:px-16"
        style={{ background: '#f0ece0' }}
      >
        <div className="w-full max-w-[420px]">

          {/* Header */}
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: '#3d3628', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace" }}
          >
            Workspace Login
          </p>
          <h2
            className="text-[40px] leading-[1.2] mt-6 font-italic"
            style={{ color: '#1a1410', fontFamily: "'Playfair Display', serif" }}
          >
            Sign in to continue
          </h2>

          {/* Form */}
          <form onSubmit={handleLogin} className="mt-12" id="login-form">

            {/* Email */}
            <div className="mb-6">
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-2.5"
                style={{ color: '#3d3628', fontFamily: "'JetBrains Mono', monospace" }}
              >
                Workspace Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="you@company.com"
                className="w-full h-[44px] rounded-lg px-4 text-[14px] outline-none disabled:opacity-50"
                style={{
                  background: '#dad3bd',
                  color: '#1a1410',
                  border: `1px solid ${authError ? '#c0392b' : '#d0c9bc'}`,
                  transition: 'border-color 120ms ease',
                  fontFamily: "'DM Sans', sans-serif"
                }}
                onFocus={(e) => {
                  if (!authError) e.target.style.borderColor = '#3d3628';
                }}
                onBlur={(e) => {
                  if (!authError) e.target.style.borderColor = '#d0c9bc';
                }}
                id="login-email"
                autoComplete="email"
              />
              {/* Error */}
              {authError && (
                <p
                  className="mt-2 text-[11px] flex items-center gap-1"
                  style={{ color: '#c0392b' }}
                >
                  <span>✗</span> {authError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <label
                  className="text-[11px] uppercase tracking-wider font-semibold"
                  style={{ color: '#3d3628', fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[12px] hover:underline"
                  style={{ color: '#3d3628' }}
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
                className="w-full h-[44px] rounded-lg px-4 text-[14px] outline-none disabled:opacity-50"
                style={{
                  background: '#dad3bd',
                  color: '#1a1410',
                  border: '1px solid #d0c9bc',
                  transition: 'border-color 120ms ease',
                  fontFamily: "'DM Sans', sans-serif"
                }}
                onFocus={(e) => { e.target.style.borderColor = '#3d3628'; }}
                onBlur={(e) => { e.target.style.borderColor = '#d0c9bc'; }}
                id="login-password"
                autoComplete="current-password"
              />
            </div>

            {/* Remember me */}
            <div className="mb-8 flex items-center gap-3">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="login-checkbox"
                id="login-remember"
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  width: '18px',
                  height: '18px',
                  border: '1px solid #d0c9bc',
                  borderRadius: '4px',
                  background: rememberMe ? '#1a1410' : '#dad3bd',
                  cursor: 'pointer',
                  flexShrink: 0,
                  accentColor: '#1a1410'
                }}
              />
              <label
                htmlFor="login-remember"
                className="text-[14px] cursor-pointer select-none"
                style={{ color: '#3d3628', fontFamily: "'DM Sans', sans-serif" }}
              >
                Keep me signed in
              </label>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[44px] rounded-lg font-semibold text-[16px] flex items-center justify-center disabled:cursor-not-allowed"
              style={{
                background: '#1a1410',
                color: '#f0ece0',
                border: 'none',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.02em',
                opacity: loading ? 0.8 : 1,
                transition: 'transform 80ms ease, opacity 120ms ease',
              }}
              onMouseDown={(e) => {
                if (!loading) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              id="login-submit-btn"
            >
              {loading ? (
                <svg
                  className="animate-spin"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'spin 0.7s linear infinite' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#f0ece0"
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
          <div className="relative mt-8 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full"
                style={{ borderTop: '1px solid #d0c9bc' }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-3 text-[11px] uppercase"
                style={{ background: '#f0ece0', color: '#7a7060', fontFamily: "'JetBrains Mono', monospace" }}
              >
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO button */}
          <button
            type="button"
            disabled={loading}
            className="w-full h-[44px] rounded-lg text-[15px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'transparent',
              color: '#3d3628',
              border: '1px solid #d0c9bc',
              transition: 'background 120ms ease',
              fontFamily: "'DM Sans', sans-serif"
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#dad3bd'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            id="login-sso-btn"
          >
            Continue with SSO
          </button>

          {/* Footer */}
          <div className="mt-8">
            <p className="text-[13px]" style={{ color: '#7a7060', fontFamily: "'DM Sans', sans-serif" }}>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onGoToSignup}
                className="hover:underline bg-transparent border-none cursor-pointer p-0 font-semibold"
                style={{ color: '#3d3628', font: 'inherit' }}
              >
                Sign up
              </button>
            </p>
            <p className="text-[11px] mt-2" style={{ color: '#b0a898', fontFamily: "'JetBrains Mono', monospace" }}>
              Tokens stored in secure enclave. Not transmitted.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
