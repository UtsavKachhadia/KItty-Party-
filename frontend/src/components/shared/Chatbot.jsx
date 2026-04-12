import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

/**
 * Floating chatbot widget — bottom-right corner.
 * Powered by Groq LLM via /api/chat endpoint.
 * Maintains conversation history for context.
 */
export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the MCP Gateway assistant. Ask me about workflows, connectors, or anything else!' },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', {
        message: text,
        history: messages,
      });

      const reply = data.reply || "Sorry, I couldn't process that.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Connection issue. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Chat window ── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '360px',
            maxHeight: '500px',
            background: '#f0ece0',
            border: '1px solid #d0c9bc',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #d0c9bc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#e8e2d8'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1410' }}>
                MCP Assistant
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#7a7060',
                fontSize: '18px',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '350px',
              background: '#f0ece0'
            }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: msg.role === 'user' ? '#c9a84c' : '#e8e2d8',
                  color: msg.role === 'user' ? '#0d0b09' : '#1a1410',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  border: msg.role === 'user' ? 'none' : '1px solid #d0c9bc',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 12px',
                  borderRadius: '12px 12px 12px 2px',
                  background: '#e8e2d8',
                  border: '1px solid #d0c9bc',
                  color: '#7a7060',
                  fontSize: '12px',
                }}
              >
                Thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '0.5px solid #414755',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              disabled={loading}
              style={{
                flex: 1,
                height: '32px',
                borderRadius: '8px',
                border: '0.5px solid #414755',
                background: '#0E0E0E',
                color: '#E5E2E1',
                padding: '0 10px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                height: '32px',
                width: '32px',
                borderRadius: '8px',
                border: 'none',
                background: input.trim() && !loading ? '#007AFF' : '#007AFF40',
                color: '#F9F9F9',
                fontSize: '14px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#007AFF',
          border: 'none',
          color: '#F9F9F9',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,122,255,0.4)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        title={open ? 'Close chat' : 'Open AI assistant'}
        id="chatbot-toggle"
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  );
}
