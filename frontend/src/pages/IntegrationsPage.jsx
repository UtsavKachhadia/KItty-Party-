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
      <div className="mt-4 p-4 rounded-lg space-y-3" style={{ background: '#e8e2d8', border: '1px solid #2e2820' }}>
        {service === 'github' && (
          <input
            type="password"
            placeholder="Personal Access Token"
            className="w-full rounded px-3 py-2 text-sm outline-none"
            style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc' }}
            value={formValues.github?.token || ''}
            onChange={(e) => setFormValues(prev => ({ ...prev, github: { token: e.target.value } }))}
          />
        )}
        {service === 'slack' && (
          <input
            type="password"
            placeholder="Bot Token (xoxb-...)"
            className="w-full rounded px-3 py-2 text-sm outline-none"
            style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc' }}
            value={formValues.slack?.token || ''}
            onChange={(e) => setFormValues(prev => ({ ...prev, slack: { token: e.target.value } }))}
          />
        )}
        {service === 'jira' && (
          <>
            <input
              type="text"
              placeholder="Jira Domain (e.g., your-domain.atlassian.net)"
              className="w-full rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc' }}
              value={formValues.jira?.domain || ''}
              onChange={(e) => setFormValues(prev => ({ ...prev, jira: { ...prev.jira, domain: e.target.value } }))}
            />
            <input
              type="password"
              placeholder="API Token"
              className="w-full rounded px-3 py-2 text-sm outline-none"
              style={{ background: '#dad3bd', color: '#1a1410', border: '1px solid #d0c9bc' }}
              value={formValues.jira?.apiKey || ''}
              onChange={(e) => setFormValues(prev => ({ ...prev, jira: { ...prev.jira, apiKey: e.target.value } }))}
            />
          </>
        )}
        <div className="flex gap-2">
          <button onClick={() => handleConnect(service)} className="px-3 py-1.5 text-xs font-bold rounded" style={{ background: '#1a1410', color: '#f0ece0' }}>Save</button>
          <button onClick={() => setActiveForm(null)} className="px-3 py-1.5 text-xs" style={{ color: '#7a7060', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
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
      <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ background: '#f0ece0' }}>
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a1410' }}>Integrations</h1>
      
      {error && <div className="mb-4 p-3 rounded text-sm" style={{ background: 'rgba(192, 57, 43, 0.15)', color: '#c0392b' }}>{error}</div>}

      <div className="w-full max-w-4xl space-y-4">
        {services.map(svc => {
          const config = connectors[svc.id] || {};
          const isConnected = config.configured;
          return (
            <div key={svc.id} className="p-5 bg-surface-container rounded-xl" style={{ border: '1px solid #2e2820' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[32px]" style={{ color: '#c9a84c' }}>{svc.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: '#1a1410' }}>{svc.name}</h3>
                    <div className="flex flex-col mt-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded w-max ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-secondary/20 text-secondary'}`}>
                        {isConnected ? 'Connected' : 'Not Connected'}
                      </span>
                      {isConnected && config.maskedToken && (
                        <span className="text-xs mt-1 font-mono" style={{ color: '#7a7060' }}>{config.maskedToken}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {isConnected ? (
                    <button 
                      onClick={() => handleDisconnect(svc.id)}
                      className="px-4 py-2 font-bold text-sm rounded transition"
                      style={{ border: '1px solid #c0392b', color: '#c0392b', background: 'transparent' }}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button 
                      onClick={() => setActiveForm(activeForm === svc.id ? null : svc.id)}
                      className="px-4 py-2 font-bold text-sm rounded transition"
                      style={{ background: '#c9a84c', color: '#0d0b09' }}
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
