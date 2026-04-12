import { useState, useEffect } from 'react';
import api from '../lib/api';
import socket from '../lib/socket';

export default function RequestsPage() {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();

    socket.on('requestReceived', fetchRequests);
    socket.on('requestApproved', fetchRequests);
    socket.on('requestRejected', fetchRequests);

    return () => {
      socket.off('requestReceived', fetchRequests);
      socket.off('requestApproved', fetchRequests);
      socket.off('requestRejected', fetchRequests);
    };
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [incRes, outRes] = await Promise.all([
        api.get('/requests/incoming').catch(() => ({ data: [] })),
        api.get('/requests/outgoing').catch(() => ({ data: [] }))
      ]);
      setIncoming(incRes.data || []);
      setOutgoing(outRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    // Optimistic UI update
    setIncoming(prev => prev.filter(req => req._id !== id));
    try {
      await api.post(`/requests/${id}/${action}`);
    } catch (err) {
      console.error(err);
      fetchRequests(); // Revert on failure
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-500/20 text-yellow-500',
      APPROVED: 'bg-green-500/20 text-green-500',
      REJECTED: 'bg-red-500/20 text-red-500',
      EXPIRED: 'bg-gray-500/20 text-gray-500'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${colors[status] || colors.PENDING}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface">
      <div className="p-6 border-b border-outline-variant flex gap-4">
        <button
          className={`pb-2 text-sm font-bold border-b-2 ${tab === 'incoming' ? 'border-primary text-primary' : 'border-transparent text-secondary'}`}
          onClick={() => setTab('incoming')}
        >
          Incoming Requests
        </button>
        <button
          className={`pb-2 text-sm font-bold border-b-2 ${tab === 'outgoing' ? 'border-primary text-primary' : 'border-transparent text-secondary'}`}
          onClick={() => setTab('outgoing')}
        >
          Outgoing Requests
        </button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto w-full max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center mt-10">
            <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : tab === 'incoming' ? (
          incoming.length === 0 ? (
            <p className="text-secondary text-center mt-10">No incoming requests</p>
          ) : (
            <div className="space-y-4">
              {incoming.map(req => (
                <div key={req._id} className="p-4 bg-surface-container rounded-lg border border-outline-variant flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-on-surface">From: {req.requesterUsername}</h4>
                    <p className="text-sm text-secondary">{req.requestMessage || 'Workflow execution request'}</p>
                    <p className="text-xs text-secondary mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {req.status === 'PENDING' ? (
                      <>
                        <button onClick={() => handleAction(req._id, 'approve')} className="px-4 py-2 bg-primary/20 text-primary hover:bg-primary/40 rounded font-bold text-sm transition">
                          Approve
                        </button>
                        <button onClick={() => handleAction(req._id, 'reject')} className="px-4 py-2 bg-error/20 text-error hover:bg-error/40 rounded font-bold text-sm transition">
                          Reject
                        </button>
                      </>
                    ) : (
                      getStatusBadge(req.status)
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          outgoing.length === 0 ? (
            <p className="text-secondary text-center mt-10">No outgoing requests</p>
          ) : (
            <div className="space-y-4">
              {outgoing.map(req => (
                <div key={req._id} className="p-4 bg-surface-container rounded-lg border border-outline-variant flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-on-surface">To: {req.targetUsername}</h4>
                    <p className="text-sm text-secondary">{req.requestMessage || 'Workflow execution request'}</p>
                    <p className="text-xs text-secondary mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
