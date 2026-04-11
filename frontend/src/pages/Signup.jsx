import { useState, useMemo } from 'react';
import api from '../lib/api';

/**
 * Signup page — Email, Username, Password, Confirm Password only.
 * Split-panel layout matching the Login page design.
 * @param {{ onSignupSuccess: () => void, onGoToLogin: () => void }} props
 */
export default function Signup({ onSignupSuccess, onGoToLogin }) {
  // ── Form fields ──
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [touched, setTouched] = useState({});

  // ── Field-level validation ──
  const errors = useMemo(() => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    return e;
  }, [username, email, password, confirmPassword]);

  const isValid = Object.keys(errors).length === 0;
  const markTouched = (field) => setTouched((p) => ({ ...p, [field]: true }));

  // ── Submit handler ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    // Mark all fields as touched to show errors
    setTouched({ username: true, email: true, password: true, confirmPassword: true });
    if (!isValid || loading) return;
    setLoading(true);
    setServerError(null);

    try {
      const { data } = await api.post('/auth/register', {
        username,
        email,
        password,
      });
      if (data.token) {
        localStorage.setItem('mcp_token', data.token);
      }
      onSignupSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input style ──
  const inputStyle = (hasError) => ({
    background: '#0A0A0A',
    color: '#EDE7DF',
    border: `0.5px solid ${hasError ? '#DC3545' : '#2A2A2A'}`,
  });

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-[11px] flex items-center gap-1" style={{ color: '#DC3545' }}>
        <span>✗</span> {errors[field]}
      </p>
    ) : null;

  return (
    <div className="login-page-enter flex h-screen w-screen overflow-hidden font-sans" style={{ background: '#0D0D0D' }}>

      {/* ═══ LEFT PANEL — Brand ═══ */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] h-full p-12"
        style={{ background: '#141413' }}
      >
        <div className="flex-1 flex flex-col justify-center">
          <p
            className="text-[10px] font-semibold uppercase"
            style={{ color: '#C2A878', letterSpacing: '0.25em' }}
          >
            MCP Gateway
          </p>
          <h1
            className="text-[38px] font-semibold leading-tight mt-2"
            style={{ color: '#EDE7DF', fontFamily: "'Playfair Display', serif" }}
          >
            Create your<br />account.
          </h1>
          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: '#6C757D' }}>
            Join MCP Gateway to create agentic workflows across
            GitHub, Slack, and Jira — all from natural language.
          </p>

          {/* Terminal block */}
          <div
            className="mt-6 rounded-lg p-4 font-mono text-[11px] leading-[1.8]"
            style={{ background: '#0A0A0A', border: '0.5px solid rgba(194, 168, 120, 0.12)' }}
          >
            <p style={{ color: '#6C757D' }}>&gt; Setting up workspace...</p>
            <p style={{ color: '#28A745' }}>✓ Auth module: READY</p>
            <p style={{ color: '#FFBF00' }}>⚠ Connectors: CONFIGURE IN SETTINGS</p>
            <p style={{ color: '#6C757D' }}>
              &gt; Waiting for credentials...
              <span
                className="ml-0.5 inline-block"
                style={{ color: '#C2A878', animation: 'blink 1s step-end infinite' }}
              >
                █
              </span>
            </p>
          </div>
        </div>

        <p className="text-[10px]" style={{ color: '#6C757D' }}>
          v1.0.4-stable
        </p>
      </div>

      {/* ═══ RIGHT PANEL — Signup Form ═══ */}
      <div
        className="flex-1 flex items-center justify-center px-6 md:px-12 overflow-y-auto"
        style={{ background: '#0D0D0D' }}
      >
        <div className="w-full max-w-[400px] py-10">

          {/* Header */}
          <p
            className="text-[10px] font-semibold uppercase lg:hidden"
            style={{ color: '#C2A878', letterSpacing: '0.25em' }}
          >
            MCP Gateway
          </p>
          <h2
            className="text-[16px] font-bold mt-2"
            style={{ color: '#EDE7DF' }}
          >
            Create an account
          </h2>

          {/* Server error */}
          {serverError && (
            <div
              className="mt-4 rounded-lg p-3 text-[12px] flex items-center gap-2"
              style={{ background: '#DC354520', color: '#DC3545', border: '0.5px solid #DC354540' }}
            >
              <span>✗</span> {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6" id="signup-form">

            {/* Email */}
            <div>
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: '#C1C6D7' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => markTouched('email')}
                disabled={loading}
                placeholder="you@company.com"
                className="login-input-enhanced w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.email && errors.email)}
                id="signup-email"
                autoComplete="email"
              />
              {renderError('email')}
            </div>

            {/* Username */}
            <div className="mt-3">
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: '#C1C6D7' }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => markTouched('username')}
                disabled={loading}
                placeholder="your-username"
                className="login-input-enhanced w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.username && errors.username)}
                id="signup-username"
                autoComplete="username"
              />
              {renderError('username')}
            </div>

            {/* Password */}
            <div className="mt-3">
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: '#C1C6D7' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                disabled={loading}
                placeholder="Min 6 characters"
                className="login-input-enhanced w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.password && errors.password)}
                id="signup-password"
                autoComplete="new-password"
              />
              {renderError('password')}
            </div>

            {/* Confirm Password */}
            <div className="mt-3">
              <label
                className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                style={{ color: '#C1C6D7' }}
              >
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched('confirmPassword')}
                disabled={loading}
                placeholder="Re-enter password"
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.confirmPassword && errors.confirmPassword)}
                id="signup-confirm-password"
                autoComplete="new-password"
              />
              {renderError('confirmPassword')}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="login-btn-primary w-full h-[40px] rounded-lg font-bold text-[13px] mt-6 flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: isValid ? '#C2A878' : '#C2A87860',
                color: '#0D0D0D',
                border: 'none',
                transition: 'background 200ms ease',
              }}

              id="signup-submit-btn"
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
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6">
            <p className="text-[11px]" style={{ color: '#6C757D' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                className="hover:underline bg-transparent border-none cursor-pointer p-0"
                style={{ color: '#C2A878', font: 'inherit' }}
              >
                Sign in
              </button>
            </p>
            <p className="text-[10px] mt-2" style={{ color: '#414755' }}>
              A confirmation email will be sent after registration.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
