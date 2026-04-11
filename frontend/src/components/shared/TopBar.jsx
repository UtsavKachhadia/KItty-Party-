import { useState, useEffect } from 'react';
import api from '../../lib/api';
import useWorkflowStore from '../../store/workflowStore';

/**
 * 44px fixed top bar.
 * Shows: brand name left | connector health icons (clickable links) + status right.
 */
export default function TopBar({ onLogout }) {
  const [health, setHealth] = useState({});
  const status = useWorkflowStore((s) => s.status);

  useEffect(() => {
    api
      .get('/connectors/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({}));
  }, []);

  const isRunning = ['planning', 'running', 'awaiting_approval'].includes(status);

  // Connector icons with external links
  const connectors = [
    {
      key: 'github',
      label: 'GitHub',
      url: 'https://github.com',
      // GitHub SVG icon
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
        </svg>
      ),
    },
    {
      key: 'slack',
      label: 'Slack',
      url: 'https://slack.com',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
      ),
    },
    {
      key: 'jira',
      label: 'Jira',
      url: 'https://www.atlassian.com/software/jira',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.5V1.005A1.005 1.005 0 0 0 23.013 0z"/>
        </svg>
      ),
    },
  ];

  const statusLabel =
    status === 'planning'
      ? 'Planning'
      : status === 'awaiting_approval'
        ? 'Awaiting'
        : 'Running';

  return (
    <header
      id="topbar"
      className="h-[44px] bg-surface-container-high border-b border-[0.5px] border-outline-variant/20 flex items-center justify-between px-4 flex-shrink-0 select-none"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[16px] text-primary">
            bolt
          </span>
        </div>
        <span className="text-[16px] font-bold text-on-surface tracking-tight">
          MCP Gateway
        </span>
      </div>

      {/* Right: connector links + status + logout */}
      <div className="flex items-center gap-4">
        {/* Connector icons — clickable external links */}
        <div className="flex items-center gap-3">
          {connectors.map(({ key, label, url, icon }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 group"
              title={`${label}: ${health[key]?.configured ? 'Connected' : 'Not configured'} — Click to open`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className="text-secondary group-hover:text-on-surface-variant transition-colors">
                {icon}
              </span>
              <span
                className={`w-[6px] h-[6px] rounded-full ${
                  health[key]?.configured ? 'bg-success' : 'bg-error'
                }`}
              />
            </a>
          ))}
        </div>

        {/* Status badges */}
        {isRunning && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-primary flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-primary animate-pulse" />
            {statusLabel}
          </div>
        )}
        {status === 'completed' && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-success flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-success" />
            Done
          </div>
        )}
        {status === 'failed' && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-error flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-error" />
            Failed
          </div>
        )}

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-[11px] px-2 py-1 rounded hover:bg-surface-container-highest transition-colors"
            style={{ color: '#6C757D', background: 'transparent', border: 'none', cursor: 'pointer' }}
            title="Sign out"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
