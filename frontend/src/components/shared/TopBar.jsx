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
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" fill="#E6EDF3"/>
        </svg>
      ),
    },
    {
      key: 'slack',
      label: 'Slack',
      url: 'https://slack.com',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52z" fill="#36C5F0"></path>
          <path d="M6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#36C5F0"></path>
          <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834z" fill="#2EB67D"></path>
          <path d="M8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#2EB67D"></path>
          <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834z" fill="#E01E5A"></path>
          <path d="M17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" fill="#E01E5A"></path>
          <path d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52z" fill="#ECB22E"></path>
          <path d="M15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#ECB22E"></path>
        </svg>
      ),
    },
    {
      key: 'jira',
      label: 'Jira',
      url: 'https://www.atlassian.com/software/jira',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005z" fill="#0052CC"></path>
          <path d="M17.294 5.757H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001z" fill="#2684FF"></path>
          <path d="M23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24.013 12.5V1.005A1.005 1.005 0 0 0 23.013 0z" fill="#4C9AFF"></path>
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
      className="h-[48px] border-b flex items-center justify-between px-5 flex-shrink-0 select-none"
      style={{ background: '#181410', borderColor: '#2e2820' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#c9a84c' }}>
          <span className="text-[14px] font-bold" style={{ color: '#0d0b09' }}>M</span>
        </div>
        <span className="text-[14px] font-semibold" style={{ color: '#f0ece0', fontFamily: "'DM Sans', sans-serif" }}>
          MCP Gateway
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-sm" style={{ color: '#9a9080', border: '1px solid #2e2820', fontFamily: "'JetBrains Mono', monospace" }}>
          v1.0
        </span>
      </div>

      {/* Right: connector links + status + logout */}
      <div className="flex items-center gap-6">
        {/* Connector icons — clickable external links */}
        <div className="flex items-center gap-4">
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
              <span style={{ color: '#9a9080', transition: 'color 0.2s' }} className="group-hover:opacity-100 opacity-70">
                {icon}
              </span>
              <span
                className={`w-[7px] h-[7px] rounded-full ${
                  health[key]?.configured ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </a>
          ))}
        </div>

        {/* Status badges */}
        {isRunning && (
          <div className="px-3 py-1 rounded text-[12px] font-medium flex items-center gap-2" style={{ background: 'rgba(201, 168, 76, 0.15)', color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="w-[6px] h-[6px] rounded-full animate-pulse" style={{ background: '#c9a84c' }} />
            {statusLabel}
          </div>
        )}
        {status === 'completed' && (
          <div className="px-3 py-1 rounded text-[12px] font-medium flex items-center gap-2" style={{ background: 'rgba(46, 125, 82, 0.15)', color: '#2e7d52', fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#2e7d52' }} />
            Done
          </div>
        )}
        {status === 'failed' && (
          <div className="px-3 py-1 rounded text-[12px] font-medium flex items-center gap-2" style={{ background: 'rgba(192, 57, 43, 0.15)', color: '#e57373', fontFamily: "'JetBrains Mono', monospace" }}>
            <span className="w-[6px] h-[6px] rounded-full" style={{ background: '#e57373' }} />
            Failed
          </div>
        )}

        {/* Logout button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-[12px] px-3 py-1.5 rounded hover:opacity-100 transition-opacity"
            style={{ color: '#9a9080', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            title="Sign out"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
