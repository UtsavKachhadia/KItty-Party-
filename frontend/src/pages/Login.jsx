import { useState } from 'react';
import api from '../lib/api';

/**
 * Login & Register page — pre-auth gate with split-panel layout.
 * Left: brand + terminal animation. Right: login/signup form.
 * No app shell (TopBar/Sidebar/RightPanel) rendered.
 * @param {{ onLoginSuccess: () => void }} props
 */
export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  
  const [email, setEmail] = useState('admin@mcp.com');
  const [password, setPassword] = useState('admin123');
  const [name, setName] = useState('');
  
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    setAuthError(null);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';
    const payload = isRegister ? { name, email, password } : { email, password };

    try {
      const { data } = await api.post(endpoint, payload);
      if (data.token) {
        localStorage.setItem('mcp_token', data.token);
      }
      onLoginSuccess();
    } catch (err) {
      if (err.response?.data?.error) {
        setAuthError(err.response.data.error);
      } else if (err.response?.status === 401) {
        setAuthError('Invalid credentials. Check your email and try again.');
      } else {
        setAuthError('Connection failed. Retry or contact your admin.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ background: '#131313' }}>

      {/* ═══ LEFT PANEL — Brand / Terminal ═══ */}
      <div
        className="hidden md:flex flex-col justify-between w-[60%] h-full p-12"
        style={{ background: '#1C1B1B' }}
      >
        {/* Brand block */}
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: '#6C757D', letterSpacing: '0.2em' }}
          >
            MCP Gateway
          </p>
          <h1
            className="text-[36px] font-bold leading-tight mt-2"
            style={{ color: '#E5E2E1' }}
          >
            Agentic workflow<br />execution.
          </h1>

          {/* Terminal block */}
          <div
            className="mt-6 rounded-lg p-4 font-mono text-[11px] leading-relaxed"
            style={{ background: '#0E0E0E', border: '0.5px solid #414755' }}
          >
            <p style={{ color: '#6C757D' }}>&gt; Initializing MCP runtime...</p>
            <p style={{ color: '#28A745' }}>✓ GitHub connector: ACTIVE</p>
            <p style={{ color: '#28A745' }}>✓ Slack connector: ACTIVE</p>
            <p style={{ color: '#28A745' }}>✓ Jira connector: ACTIVE</p>
            <p style={{ color: '#6C757D' }}>&gt; Loading workflow engine...</p>
            <p style={{ color: '#6C757D' }}>
              &gt; Awaiting authentication...
              <span
                className="ml-0.5 inline-block"
                style={{
                  color: '#007AFF',
                  animation: 'blink 1s step-end infinite',
                }}
              >
                █
              </span>
            </p>
          </div>
        </div>

        {/* Version */}
        <p className="text-[10px]" style={{ color: '#6C757D' }}>
          v1.0.4-stable
        </p>
      </div>

      {/* ═══ RIGHT PANEL — Login Form ═══ */}
      <div
        className="flex-1 flex items-center justify-center px-6 md:px-12"
        style={{ background: '#131313' }}
      >
        <div className="w-full max-w-[400px]">

          {/* Header */}
          <p
            className="text-[11px] font-bold uppercase"
            style={{ color: '#6C757D', letterSpacing: '0.2em' }}
          >
            MCP Gateway
          </p>
          <h2
            className="text-[16px] font-bold mt-2"
            style={{ color: '#E5E2E1' }}
          >
            {isRegister ? 'Create an account' : 'Sign in to continue'}
          </h2>
          {!isRegister && (
            <p className="text-[11px] mt-1" style={{ color: '#007AFF' }}>
              Admin: <b>admin@mcp.com</b> / <b>admin123</b>
            </p>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8" id="login-form">

            {/* Name (Only for Register) */}
            {isRegister && (
              <div className="mb-4">
                <label
                  className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: '#C1C6D7' }}
                >
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  placeholder="Jane Doe"
                  className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                  style={{
                    background: '#0E0E0E',
                    color: '#E5E2E1',
                    border: '0.5px solid #414755',
                    transition: 'border-color 120ms ease',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#007AFF'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#414755'; }}
                />
              </div>
            )}

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
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={{
                  background: '#0E0E0E',
                  color: '#E5E2E1',
                  border: `0.5px solid ${authError ? '#DC3545' : '#414755'}`,
                  transition: 'border-color 120ms ease',
                }}
                onFocus={(e) => {
                  if (!authError) e.target.style.borderColor = '#007AFF';
                }}
                onBlur={(e) => {
                  if (!authError) e.target.style.borderColor = '#414755';
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
                {!isRegister && (
                  <a
                    href="#"
                    className="text-[11px] hover:underline"
                    style={{ color: '#007AFF' }}
                    tabIndex={0}
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••••••"
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={{
                  background: '#0E0E0E',
                  color: '#E5E2E1',
                  border: '0.5px solid #414755',
                  transition: 'border-color 120ms ease',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#007AFF'; }}
                onBlur={(e) => { e.target.style.borderColor = '#414755'; }}
                id="login-password"
                autoComplete={isRegister ? "new-password" : "current-password"}
              />
            </div>

            {/* Remember me */}
            {!isRegister && (
              <div className="mt-3 flex items-center gap-2">
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
                    width: '12px',
                    height: '12px',
                    border: '0.5px solid #414755',
                    borderRadius: '3px',
                    background: rememberMe ? '#007AFF' : '#0E0E0E',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <label
                  htmlFor="login-remember"
                  className="text-[11px] cursor-pointer select-none"
                  style={{ color: '#C1C6D7' }}
                >
                  Keep me signed in
                </label>
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[36px] rounded-lg font-bold text-[13px] mt-6 flex items-center justify-center disabled:cursor-not-allowed"
              style={{
                background: '#007AFF',
                color: '#F9F9F9',
                border: 'none',
                opacity: loading ? 0.7 : 1,
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
                    stroke="#F9F9F9"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="15.7 47.1"
                  />
                </svg>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mt-6 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div
                className="w-full"
                style={{ borderTop: '0.5px solid #414755' }}
              />
            </div>
            <div className="relative flex justify-center">
              <span
                className="px-2 text-[11px] uppercase"
                style={{ background: '#131313', color: '#6C757D' }}
              >
                Or continue with
              </span>
            </div>
          </div>

          {/* SSO button */}
          <button
            type="button"
            disabled={loading}
            className="w-full h-[36px] rounded-lg text-[13px] font-sans flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'transparent',
              color: '#E5E2E1',
              border: '0.5px solid #414755',
              transition: 'background 120ms ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#2A2A2A'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            id="login-sso-btn"
          >
            Continue with SSO
          </button>

          {/* Footer Toggle */}
          <div className="mt-8">
            <p className="text-[11px]" style={{ color: '#6C757D' }}>
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsRegister(!isRegister);
                  setAuthError(null);
                  if (isRegister) {
                    setEmail('admin@mcp.com');
                    setPassword('admin123');
                  } else {
                    setEmail('');
                    setPassword('');
                  }
                }}
                className="hover:underline font-semibold"
                style={{ color: '#007AFF' }}
              >
                {isRegister ? 'Sign In' : 'Sign Up'}
              </a>
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
