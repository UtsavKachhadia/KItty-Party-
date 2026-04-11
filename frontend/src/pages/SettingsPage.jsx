import { useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Connector Settings page.
 * Shows connector cards (GitHub, Slack, Jira) with token inputs and test buttons.
 */

const CONNECTORS = [
  {
    key: 'github',
    label: 'GitHub',
    icon: 'hub',
    fields: [{ name: 'token', label: 'Personal Access Token', type: 'password' }],
  },
  {
    key: 'slack',
    label: 'Slack',
    icon: 'forum',
    fields: [{ name: 'token', label: 'Bot Token', type: 'password' }],
  },
  {
    key: 'jira',
    label: 'Jira',
    icon: 'task_alt',
    fields: [
      { name: 'apiKey', label: 'API Key', type: 'password' },
      { name: 'domain', label: 'Domain', type: 'text', placeholder: 'yourorg.atlassian.net' },
    ],
  },
];

export default function SettingsPage() {
  const [health, setHealth] = useState({});
  const [testing, setTesting] = useState({});
  const [formData, setFormData] = useState({});

  useEffect(() => {
    api
      .get('/connectors/health')
      .then((res) => {
        setHealth(res.data);
        
        // Pre-populate formData with masked tokens/domains for already configured connectors
        const savedData = {};
        Object.entries(res.data).forEach(([key, info]) => {
          if (info.configured) {
            if (key === 'github' || key === 'slack') {
              savedData[key] = { token: info.maskedToken };
            } else if (key === 'jira') {
              savedData[key] = { apiKey: info.maskedToken, domain: info.domain };
            }
          }
        });
        setFormData(savedData);
      })
      .catch(() => setHealth({}));
  }, []);

  const handleTest = async (connectorKey) => {
    setTesting((prev) => ({ ...prev, [connectorKey]: true }));
    try {
      const payload = formData[connectorKey] || {};
      const res = await api.post(`/connectors/test/${connectorKey}`, payload);
      
      if (res.data.success) {
        // Automatically save the successful configuration
        await api.post('/connectors/save', { [connectorKey]: payload });
        
        // Refresh overall health status
        const healthRes = await api.get('/connectors/health');
        setHealth(healthRes.data);
        
        alert(`${res.data.message}\n\nConfiguration has been verified and saved automatically.`);
      } else {
        alert('Test failed: ' + res.data.message);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      alert('Error testing connection: ' + errMsg);
    } finally {
      setTesting((prev) => ({ ...prev, [connectorKey]: false }));
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/connectors/save', formData);
      alert('Settings saved successfully!');
      
      const res = await api.get('/connectors/health');
      setHealth(res.data);
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  const handleFieldChange = (connectorKey, fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [connectorKey]: { ...(prev[connectorKey] || {}), [fieldName]: value },
    }));
  };

  return (
    <div className="h-full overflow-y-auto" id="settings-page">
      <div className="max-w-[900px] mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[16px] font-bold text-on-surface">
            Connector Settings
          </h1>
          <p className="text-[11px] text-secondary mt-1">
            Configure and test your integrations with external services.
          </p>
        </div>

        {/* Connector cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {CONNECTORS.map((connector) => {
            const isConfigured = health[connector.key]?.configured || false;
            const isTesting = testing[connector.key] || false;

            return (
              <div
                key={connector.key}
                className="bg-surface-container-high rounded-lg border-[0.5px] border-outline-variant p-4 flex flex-col gap-3"
              >
                {/* Card header */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-secondary">
                    {connector.icon}
                  </span>
                  <span className="text-[13px] font-bold text-on-surface">
                    {connector.label}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span
                      className={`w-[6px] h-[6px] rounded-full ${
                        isConfigured ? 'bg-success' : 'bg-error'
                      }`}
                    />
                    <span
                      className={`text-[11px] ${
                        isConfigured ? 'text-success' : 'text-error'
                      }`}
                    >
                      {isConfigured ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                {/* Fields */}
                {connector.fields.map((field) => (
                  <div key={field.name}>
                    <label className="text-[11px] text-secondary block mb-1">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                      value={formData[connector.key]?.[field.name] || ''}
                      onChange={(e) =>
                        handleFieldChange(connector.key, field.name, e.target.value)
                      }
                      className="w-full bg-surface-container-lowest border-[0.5px] border-outline-variant rounded-lg px-3 py-2 text-[13px] font-mono text-on-surface focus:outline-none focus:border-primary transition-colors placeholder:text-secondary/50"
                    />
                  </div>
                ))}

                {/* Test button */}
                <button
                  onClick={() => handleTest(connector.key)}
                  disabled={isTesting}
                  className="border-[0.5px] border-outline-variant bg-transparent rounded-lg text-[11px] font-bold text-on-surface-variant px-3 py-1.5 hover:bg-surface-container-highest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isTesting && (
                    <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  )}
                  {isTesting ? 'Testing...' : 'Test Connection'}
                </button>

                {/* Available actions */}
                {health[connector.key]?.actions && (
                  <div className="mt-1">
                    <span className="text-[11px] text-secondary block mb-1">
                      Available actions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {health[connector.key].actions.map((action) => (
                        <span
                          key={action}
                          className="text-[11px] text-on-surface-variant bg-surface-container-lowest px-1.5 py-0.5 rounded font-mono"
                        >
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 border-t border-[0.5px] border-outline-variant/20 pt-4">
          <button className="text-secondary text-[13px] hover:text-on-surface-variant transition-colors">
            Discard changes
          </button>
          <button 
            onClick={handleSave}
            className="bg-primary text-on-primary rounded-lg font-bold text-[13px] px-4 py-2 hover:brightness-110 transition-all active:scale-[0.97]"
          >
            Save settings
          </button>
        </div>

        {/* Security Audit panel */}
        <div className="mt-8 bg-surface-container-high rounded-lg border-[0.5px] border-outline-variant p-4">
          <h2 className="text-[13px] font-bold text-on-surface mb-3">
            Security Audit
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-secondary">LAST_ENCLAVE_SYNC</span>
              <span className="text-on-surface font-mono tabular-nums">
                {new Date().toISOString().slice(0, 19)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-secondary">ENCRYPTION_MODE</span>
              <span className="text-success font-mono">AES-256-GCM</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-secondary">API_KEY_STATUS</span>
              <span className="text-success font-mono">ACTIVE</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-secondary">TOKEN_ROTATION</span>
              <span className="text-tertiary font-mono">MANUAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
