import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function IntegrationsPage() {
  const [connectors, setConnectors] = useState({ github: {}, slack: {}, jira: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Connection form state
  const [activeForm, setActiveForm] = useState(null);
  const [formValues, setFormValues] = useState({});

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const { data } = await api.get('/connectors/health');
      setConnectors(data);
    } catch (err) {
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (service) => {
    setError(null);
    try {
      // Structure payload expected by `/api/connectors/save`
      const payload = { [service]: formValues[service] };
      await api.post('/connectors/save', payload);
      setActiveForm(null);
      setFormValues(prev => ({ ...prev, [service]: {} }));
      await fetchHealth();
    } catch (err) {
      setError(err.message || `Failed to connect ${service}`);
    }
  };

  const handleDisconnect = async (service) => {
    if (!window.confirm(`Are you sure you want to disconnect ${service}?`)) return;
    try {
      // We can overwrite with empty to disconnect, or use a specific disconnect endpoint
      const payload = { [service]: { token: '', apiKey: '', domain: '' } };
      await api.post('/connectors/save', payload);
      await fetchHealth();
    } catch (err) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const renderForm = (service, title) => {
    if (activeForm !== service) return null;
    return (
      <div className="mt-4 p-4 border border-outline-variant bg-surface-container rounded-lg space-y-3">
        {service === 'github' && (
          <input
            type="password"
            placeholder="Personal Access Token"
            className="w-full bg-surface-container-lowest border-[0.5px] border-outline-variant rounded px-3 py-2 text-sm text-on-surface"
            value={formValues.github?.token || ''}
            onChange={(e) => setFormValues(prev => ({ ...prev, github: { token: e.target.value } }))}
          />
        )}
        {service === 'slack' && (
          <input
            type="password"
            placeholder="Bot Token (xoxb-...)"
            className="w-full bg-surface-container-lowest border-[0.5px] border-outline-variant rounded px-3 py-2 text-sm text-on-surface"
            value={formValues.slack?.token || ''}
            onChange={(e) => setFormValues(prev => ({ ...prev, slack: { token: e.target.value } }))}
          />
        )}
        {service === 'jira' && (
          <>
            <input
              type="text"
              placeholder="Jira Domain (e.g., your-domain.atlassian.net)"
              className="w-full bg-surface-container-lowest border-[0.5px] border-outline-variant rounded px-3 py-2 text-sm text-on-surface"
              value={formValues.jira?.domain || ''}
              onChange={(e) => setFormValues(prev => ({ ...prev, jira: { ...prev.jira, domain: e.target.value } }))}
            />
            <input
              type="password"
              placeholder="API Token"
              className="w-full bg-surface-container-lowest border-[0.5px] border-outline-variant rounded px-3 py-2 text-sm text-on-surface"
              value={formValues.jira?.apiKey || ''}
              onChange={(e) => setFormValues(prev => ({ ...prev, jira: { ...prev.jira, apiKey: e.target.value } }))}
            />
          </>
        )}
        <div className="flex gap-2">
          <button onClick={() => handleConnect(service)} className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded hover:brightness-110">Save</button>
          <button onClick={() => setActiveForm(null)} className="px-3 py-1.5 text-secondary text-xs hover:text-on-surface">Cancel</button>
        </div>
      </div>
    );
  };

  const services = [
    { id: 'github', name: 'GitHub', icon: 'code' },
    { id: 'slack', name: 'Slack', icon: 'forum' },
    { id: 'jira', name: 'Jira', icon: 'task' }
  ];

  if (loading) return (
    <div className="flex-1 flex justify-center items-center h-full text-secondary">
      <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-surface p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-on-surface mb-6">Integrations</h1>
      
      {error && <div className="mb-4 p-3 bg-error/20 text-error rounded text-sm">{error}</div>}

      <div className="w-full max-w-4xl space-y-4">
        {services.map(svc => {
          const config = connectors[svc.id] || {};
          const isConnected = config.configured;
          return (
            <div key={svc.id} className="p-5 border border-outline-variant bg-surface-container rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[32px] text-primary">{svc.icon}</span>
                  <div>
                    <h3 className="text-on-surface font-bold text-lg">{svc.name}</h3>
                    <div className="flex flex-col mt-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded w-max ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-secondary/20 text-secondary'}`}>
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      {isConnected && config.maskedToken && (
                        <span className="text-xs text-secondary mt-1 font-mono">{config.maskedToken}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {isConnected ? (
                    <button 
                      onClick={() => handleDisconnect(svc.id)}
                      className="px-4 py-2 border border-error text-error hover:bg-error/10 font-bold text-sm rounded transition"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => setActiveForm(activeForm === svc.id ? null : svc.id)}
                      className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/40 font-bold text-sm rounded transition"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              
              {!isConnected && renderForm(svc.id, svc.name)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
