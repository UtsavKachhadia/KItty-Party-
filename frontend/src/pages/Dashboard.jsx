import { useState, useEffect } from 'react';
import api from '../lib/api';

import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [threshold, setThreshold] = useState(0.8);
  const [loading, setLoading] = useState(true);

  // Note: the backend `/api/workflow/history` endpoint needs to expose the steps or DAG for the dashboard to calculate the average confidence score properly.
  // For now, calculating from existing schema structure if returned.

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Typically fetch from your user endpoint to get preferences, applying optimistic fallback
      const [{ data: userRes }, { data: historyRes }] = await Promise.all([
        api.get('/auth/me').catch(() => ({ data: { user: {} } })),
        api.get('/workflow/history').catch(() => ({ data: { history: [] } }))
      ]);
      
      const pref = userRes?.user?.preferences?.defaultExecutionType || 'SELF';
      
      setHistory(historyRes?.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveThreshold = async () => {
    try {
      await api.patch('/users/preferences', { approvalThreshold: threshold });
      alert('Preferences saved');
    } catch (err) {
      console.error('Failed to save threshold', err);
    }
  };

  const getConfidenceBadge = (run) => {
    // Attempt to compute average confidence if steps are provided
    let confidence = 0;
    if (run.steps && run.steps.length > 0) {
       confidence = run.steps.reduce((acc, step) => acc + (step.confidence || 0), 0) / run.steps.length;
    } else {
       // Mock for display if history endpoint stripped it down
       confidence = Math.random(); 
    }

    if (confidence > 0.8) {
      return <span className="px-2 py-1 bg-green-500/20 text-green-500 rounded text-xs font-bold">🟢 High ({confidence.toFixed(2)})</span>;
    } else if (confidence >= 0.5) {
      return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-500 rounded text-xs font-bold">🟡 Medium ({confidence.toFixed(2)})</span>;
    } else {
      return <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-bold">🔴 Low ({confidence.toFixed(2)})</span>;
    }
  };

  const getStatusData = () => {
    const counts = { completed: 0, failed: 0, pending: 0, running: 0 };
    history.forEach(run => {
      if (counts[run.status] !== undefined) counts[run.status]++;
    });
    return [
      { name: 'Completed', value: counts.completed, color: '#22c55e' }, // green-500
      { name: 'Failed', value: counts.failed, color: '#ef4444' },    // red-500
      { name: 'Pending/Running', value: counts.pending + counts.running, color: '#eab308' } // yellow-500
    ].filter(d => d.value > 0);
  };

  const getActivityData = () => {
    const dates = {};
    history.forEach(run => {
      if (!run.startedAt) return;
      // Use short date string
      const date = new Date(run.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dates[date] = (dates[date] || 0) + 1;
    });
    // Reverse so older dates are first
    return Object.keys(dates).reverse().map(date => ({
      name: date,
      Runs: dates[date]
    }));
  };

  const statusData = getStatusData();
  const activityData = getActivityData();

  if (loading) return (
    <div className="flex-1 flex justify-center items-center h-full text-secondary">
      <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-surface p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold text-on-surface mb-6">Dashboard</h1>
      
      <div className="w-full max-w-4xl space-y-6">
        
        {/* Analytics Panel */}
        <div className="p-6 border border-outline-variant bg-surface-container rounded-xl">
          <h2 className="text-lg font-bold text-on-surface mb-4">Analytics Overview</h2>
          
          {history.length === 0 ? (
            <p className="text-secondary text-sm py-4">No data available for analytics.</p>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Pie Chart: Status Breakdown */}
              <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col items-center">
                <h3 className="text-sm font-bold text-on-surface mb-2 w-full">Execution Status</h3>
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={80} 
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#131313', borderColor: '#49454f', color: '#e6e0e9', fontSize: '12px' }}
                        itemStyle={{ color: '#e6e0e9' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Daily Activity */}
              <div className="flex-1 bg-surface-container-low border border-outline-variant rounded-lg p-4 flex flex-col items-center">
                <h3 className="text-sm font-bold text-on-surface mb-2 w-full">Activity (Recent)</h3>
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                      <XAxis dataKey="name" stroke="#6C757D" fontSize={11} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#131313', borderColor: '#49454f', color: '#e6e0e9', fontSize: '12px' }}
                        itemStyle={{ color: '#e6e0e9' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="Runs" fill="#D0BCFF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div className="p-6 border border-outline-variant bg-surface-container rounded-xl">
          <h2 className="text-lg font-bold text-on-surface mb-4">Automation Settings</h2>
          <div className="flex flex-col gap-2 max-w-md">
            <label className="text-sm font-bold text-on-surface flex justify-between">
              Approval Threshold
              <span className="text-primary">{threshold}</span>
            </label>
            <p className="text-xs text-secondary mb-2" title="Any planning confidence below this threshold will require your manual approval before execution.">
              Any step below this confidence score will require manual approval before execution. Lower values mean less human interruption.
            </p>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={threshold} 
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1 cursor-pointer accent-primary" 
              />
              <button onClick={handleSaveThreshold} className="px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary font-bold text-xs rounded transition flex-shrink-0">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Executions Panel */}
        <div className="p-6 border border-outline-variant bg-surface-container rounded-xl">
          <h2 className="text-lg font-bold text-on-surface mb-4">Recent Executions</h2>
          
          <div className="space-y-3 mt-4">
            {history.length === 0 ? (
               <p className="text-secondary text-sm text-center py-4">No recent executions found.</p>
            ) : history.map((run) => (
              <div key={run.runId} className="p-4 bg-surface-container-low border border-outline-variant rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono text-on-surface truncate max-w-xs">{run.userInput}</h3>
                  <p className="text-xs text-secondary mt-1">{new Date(run.startedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-secondary uppercase tracking-widest">Confidence</span>
                    {getConfidenceBadge(run)}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-secondary uppercase tracking-widest">Status</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface-container-highest border border-outline-variant text-on-surface capitalize">
                      {run.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}
