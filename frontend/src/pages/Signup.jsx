import { useState, useMemo } from 'react';
import api from '../lib/api';

/**
 * Signup page — registration with connector testing.
 * Split-panel layout matching the Login page design.
 * @param {{ onSignupSuccess: () => void, onGoToLogin: () => void }} props
 */
export default function Signup({ onSignupSuccess, onGoToLogin }) {
  // ── Form fields ──
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Connector fields ──
  const [githubToken, setGithubToken] = useState('');
  const [slackToken, setSlackToken] = useState('');
  const [jiraApiKey, setJiraApiKey] = useState('');
  const [jiraDomain, setJiraDomain] = useState('');

  // ── UI state ──
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [touched, setTouched] = useState({});

  // ── Connector test state ──
  const [connectorStatus, setConnectorStatus] = useState({
    github: { testing: false, result: null, message: '' },
    slack:  { testing: false, result: null, message: '' },
    jira:   { testing: false, result: null, message: '' },
  });

  // ── Field-level validation ──
  const errors = useMemo(() => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    else if (!/\d/.test(password)) e.password = 'Password must contain at least 1 number';
    if (!confirmPassword) e.confirmPassword = 'Confirm your password';
    else if (confirmPassword !== password) e.confirmPassword = 'Passwords do not match';
    return e;
  }, [username, email, password, confirmPassword]);

  const isValid = Object.keys(errors).length === 0;

  const markTouched = (field) => setTouched((p) => ({ ...p, [field]: true }));

  // ── Test connection handlers ──
  const testGithub = async () => {
    if (!githubToken.trim()) return;
    setConnectorStatus((p) => ({ ...p, github: { testing: true, result: null, message: '' } }));
    try {
      const { data } = await api.post('/connectors/test/github', { token: githubToken });
      setConnectorStatus((p) => ({
        ...p,
        github: { testing: false, result: data.success ? 'success' : 'failed', message: data.message },
      }));
    } catch {
      setConnectorStatus((p) => ({
        ...p,
        github: { testing: false, result: 'failed', message: 'Connection failed' },
      }));
    }
  };

  const testSlack = async () => {
    if (!slackToken.trim()) return;
    setConnectorStatus((p) => ({ ...p, slack: { testing: true, result: null, message: '' } }));
    try {
      const { data } = await api.post('/connectors/test/slack', { token: slackToken });
      setConnectorStatus((p) => ({
        ...p,
        slack: { testing: false, result: data.success ? 'success' : 'failed', message: data.message },
      }));
    } catch {
      setConnectorStatus((p) => ({
        ...p,
        slack: { testing: false, result: 'failed', message: 'Connection failed' },
      }));
    }
  };

  const testJira = async () => {
    if (!jiraApiKey.trim() || !jiraDomain.trim()) return;
    setConnectorStatus((p) => ({ ...p, jira: { testing: true, result: null, message: '' } }));
    try {
      const { data } = await api.post('/connectors/test/jira', {
        apiKey: jiraApiKey,
        domain: jiraDomain,
        email,
      });
      setConnectorStatus((p) => ({
        ...p,
        jira: { testing: false, result: data.success ? 'success' : 'failed', message: data.message },
      }));
    } catch {
      setConnectorStatus((p) => ({
        ...p,
        jira: { testing: false, result: 'failed', message: 'Connection failed' },
      }));
    }
  };

  // ── Submit handler ──
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!isValid || loading) return;
    setLoading(true);
    setServerError(null);

    try {
      const { data } = await api.post('/auth/signup', {
        username,
        email,
        password,
        connectors: {
          github: { token: githubToken },
          slack:  { token: slackToken },
          jira:   { apiKey: jiraApiKey, domain: jiraDomain },
        },
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
    background: '#0E0E0E',
    color: '#E5E2E1',
    border: `0.5px solid ${hasError ? '#DC3545' : '#414755'}`,
    transition: 'border-color 120ms ease',
  });

  const renderError = (field) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-[11px] flex items-center gap-1" style={{ color: '#DC3545' }}>
        <span>✗</span> {errors[field]}
      </p>
    ) : null;

  const renderConnectorResult = (key) => {
    const s = connectorStatus[key];
    if (s.testing) {
      return (
        <span className="text-[11px] ml-2" style={{ color: '#6C757D' }}>
          Testing…
        </span>
      );
    }
    if (s.result === 'success') {
      return (
        <span className="text-[11px] ml-2" style={{ color: '#28A745' }}>
          ✅ {s.message || 'Connected'}
        </span>
      );
    }
    if (s.result === 'failed') {
      return (
        <span className="text-[11px] ml-2" style={{ color: '#DC3545' }}>
          ❌ {s.message || 'Failed'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans" style={{ background: '#131313' }}>

      {/* ═══ LEFT PANEL — Brand ═══ */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] h-full p-12"
        style={{ background: '#1C1B1B' }}
      >
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
            Create your<br />account.
          </h1>
          <p className="mt-4 text-[13px] leading-relaxed" style={{ color: '#6C757D' }}>
            Connect your GitHub, Slack, and Jira accounts to enable
            agentic workflow execution across your entire dev stack.
          </p>

          {/* Terminal block */}
          <div
            className="mt-6 rounded-lg p-4 font-mono text-[11px] leading-relaxed"
            style={{ background: '#0E0E0E', border: '0.5px solid #414755' }}
          >
            <p style={{ color: '#6C757D' }}>&gt; Setting up workspace...</p>
            <p style={{ color: '#28A745' }}>✓ Auth module: READY</p>
            <p style={{ color: '#FFBF00' }}>⚠ Connectors: AWAITING CONFIG</p>
            <p style={{ color: '#6C757D' }}>
              &gt; Waiting for credentials...
              <span
                className="ml-0.5 inline-block"
                style={{ color: '#007AFF', animation: 'blink 1s step-end infinite' }}
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
        className="flex-1 flex items-start justify-center px-6 md:px-12 overflow-y-auto"
        style={{ background: '#131313' }}
      >
        <div className="w-full max-w-[440px] py-10">

          {/* Header */}
          <p
            className="text-[11px] font-bold uppercase lg:hidden"
            style={{ color: '#6C757D', letterSpacing: '0.2em' }}
          >
            MCP Gateway
          </p>
          <h2
            className="text-[16px] font-bold mt-2"
            style={{ color: '#E5E2E1' }}
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

            {/* ── Section: User Info ── */}
            <p
              className="text-[10px] font-bold uppercase mb-3"
              style={{ color: '#007AFF', letterSpacing: '0.15em' }}
            >
              Account Details
            </p>

            {/* Username */}
            <div>
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
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.username && errors.username)}
                id="signup-username"
                autoComplete="username"
              />
              {renderError('username')}
            </div>

            {/* Email */}
            <div className="mt-3">
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
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                style={inputStyle(touched.email && errors.email)}
                id="signup-email"
                autoComplete="email"
              />
              {renderError('email')}
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
                placeholder="Min 6 chars, at least 1 number"
                className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
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

            {/* ── Section: Connectors ── */}
            <div className="mt-8 pt-6" style={{ borderTop: '0.5px solid #414755' }}>
              <p
                className="text-[10px] font-bold uppercase mb-1"
                style={{ color: '#007AFF', letterSpacing: '0.15em' }}
              >
                Connectors
              </p>
              <p className="text-[11px] mb-4" style={{ color: '#6C757D' }}>
                Optional — configure now or later in Settings.
              </p>

              {/* GitHub Token */}
              <div>
                <label
                  className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: '#C1C6D7' }}
                >
                  GitHub Personal Access Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => {
                      setGithubToken(e.target.value);
                      setConnectorStatus((p) => ({ ...p, github: { testing: false, result: null, message: '' } }));
                    }}
                    disabled={loading}
                    placeholder="ghp_..."
                    className="flex-1 h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                    style={inputStyle(false)}
                    id="signup-github-token"
                  />
                  <button
                    type="button"
                    onClick={testGithub}
                    disabled={loading || !githubToken.trim() || connectorStatus.github.testing}
                    className="h-[36px] px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'transparent',
                      color: '#007AFF',
                      border: '0.5px solid #007AFF',
                      transition: 'background 120ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    id="signup-test-github"
                  >
                    {connectorStatus.github.testing ? '...' : 'Test'}
                  </button>
                </div>
                {renderConnectorResult('github')}
              </div>

              {/* Slack Token */}
              <div className="mt-3">
                <label
                  className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: '#C1C6D7' }}
                >
                  Slack Bot Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={slackToken}
                    onChange={(e) => {
                      setSlackToken(e.target.value);
                      setConnectorStatus((p) => ({ ...p, slack: { testing: false, result: null, message: '' } }));
                    }}
                    disabled={loading}
                    placeholder="xoxb-..."
                    className="flex-1 h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                    style={inputStyle(false)}
                    id="signup-slack-token"
                  />
                  <button
                    type="button"
                    onClick={testSlack}
                    disabled={loading || !slackToken.trim() || connectorStatus.slack.testing}
                    className="h-[36px] px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'transparent',
                      color: '#007AFF',
                      border: '0.5px solid #007AFF',
                      transition: 'background 120ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    id="signup-test-slack"
                  >
                    {connectorStatus.slack.testing ? '...' : 'Test'}
                  </button>
                </div>
                {renderConnectorResult('slack')}
              </div>

              {/* Jira API Key */}
              <div className="mt-3">
                <label
                  className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: '#C1C6D7' }}
                >
                  Jira API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={jiraApiKey}
                    onChange={(e) => {
                      setJiraApiKey(e.target.value);
                      setConnectorStatus((p) => ({ ...p, jira: { testing: false, result: null, message: '' } }));
                    }}
                    disabled={loading}
                    placeholder="ATATT3xFfGF0..."
                    className="flex-1 h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                    style={inputStyle(false)}
                    id="signup-jira-apikey"
                  />
                  <button
                    type="button"
                    onClick={testJira}
                    disabled={loading || !jiraApiKey.trim() || !jiraDomain.trim() || connectorStatus.jira.testing}
                    className="h-[36px] px-3 rounded-lg text-[11px] font-semibold uppercase tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'transparent',
                      color: '#007AFF',
                      border: '0.5px solid #007AFF',
                      transition: 'background 120ms ease',
                      whiteSpace: 'nowrap',
                    }}
                    id="signup-test-jira"
                  >
                    {connectorStatus.jira.testing ? '...' : 'Test'}
                  </button>
                </div>
                {renderConnectorResult('jira')}
              </div>

              {/* Jira Domain */}
              <div className="mt-3">
                <label
                  className="block text-[11px] uppercase tracking-wider font-semibold mb-1.5"
                  style={{ color: '#C1C6D7' }}
                >
                  Jira Domain
                </label>
                <input
                  type="text"
                  value={jiraDomain}
                  onChange={(e) => {
                    setJiraDomain(e.target.value);
                    setConnectorStatus((p) => ({ ...p, jira: { testing: false, result: null, message: '' } }));
                  }}
                  disabled={loading}
                  placeholder="your-team.atlassian.net"
                  className="w-full h-[36px] rounded-lg px-3 text-[13px] font-sans outline-none disabled:opacity-50"
                  style={inputStyle(false)}
                  id="signup-jira-domain"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full h-[40px] rounded-lg font-bold text-[13px] mt-8 flex items-center justify-center disabled:cursor-not-allowed"
              style={{
                background: isValid ? '#007AFF' : '#007AFF60',
                color: '#F9F9F9',
                border: 'none',
                opacity: loading ? 0.7 : 1,
                transition: 'transform 80ms ease, opacity 120ms ease, background 200ms ease',
              }}
              onMouseDown={(e) => {
                if (!loading && isValid) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
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
                    stroke="#F9F9F9"
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
          <div className="mt-6 pb-6">
            <p className="text-[11px]" style={{ color: '#6C757D' }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                className="hover:underline bg-transparent border-none cursor-pointer p-0"
                style={{ color: '#007AFF', font: 'inherit' }}
              >
                Sign in
              </button>
            </p>
            <p className="text-[10px] mt-2" style={{ color: '#414755' }}>
              Connector tokens are encrypted at rest. Never shared.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
