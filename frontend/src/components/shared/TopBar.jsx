import { useState, useEffect } from 'react';
import api from '../../lib/api';
import useWorkflowStore from '../../store/workflowStore';

/**
 * 44px fixed top bar.
 * Shows: brand name left | connector health icons + running badge right.
 */
export default function TopBar() {
  const [health, setHealth] = useState({});
  const status = useWorkflowStore((s) => s.status);

  useEffect(() => {
    api
      .get('/connectors/health')
      .then((res) => setHealth(res.data))
      .catch(() => setHealth({}));
  }, []);

  const isRunning = ['planning', 'running', 'awaiting_approval'].includes(
    status
  );

  const connectorIcons = [
    { key: 'github', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg',
    url: 'https://github.com' , label: 'GitHub' },
    { key: 'slack', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg',
    url: 'https://slack.com' , label: 'Slack' },
    { key: 'jira', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jira/jira-original.svg',
    url: 'https://www.atlassian.com/software/jira' , label: 'Jira' },
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

      {/* Right: connector health + status */}
      <div className="flex items-center gap-4">
        {/* Connector health icons */}
        <div className="flex items-center gap-3">
          {connectorIcons.map(({ key, label , logo , url}) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 group cursor-pointer hover:opacity-80 transition-opacity"
              title={`${label}: ${health[key]?.configured ? 'Connected' : 'Not configured'}`}
            >
              <img src={logo} alt={label} className="w-5 h-5 object-contain" />
              <span
                className={`w-[6px] h-[6px] rounded-full ${
                  health[key]?.configured ? 'bg-success' : 'bg-error'
                }`}
              />
            </a>
          ))}
        </div>

        {/* Running badge */}
        {isRunning && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-primary flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-primary animate-pulse" />
            {statusLabel}
          </div>
        )}

        {/* Completed badge */}
        {status === 'completed' && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-success flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-success" />
            Done
          </div>
        )}

        {/* Failed badge */}
        {status === 'failed' && (
          <div className="bg-surface-container-highest px-2.5 py-0.5 rounded text-[11px] font-medium text-error flex items-center gap-1.5">
            <span className="w-[6px] h-[6px] rounded-full bg-error" />
            Failed
          </div>
        )}
      </div>
    </header>
  );
}
