import { useState, useRef, useEffect } from 'react';
import api from '../../lib/api';

/**
 * A floating AI chatbot widget for technical support and assistance.
 */
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi there! I am the MCP Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { messages: newMessages });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: '❌ Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-12 right-6 w-12 h-12 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-50"
        title="Chat Assistance"
      >
        <span className="material-symbols-outlined text-[24px]">
          {isOpen ? 'close' : 'chat'}
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-[350px] h-[500px] bg-surface-container-high rounded-xl shadow-2xl border border-[0.5px] border-outline-variant/30 flex flex-col z-50 overflow-hidden text-[13px]">
          {/* Header */}
          <div className="h-14 bg-primary text-on-primary flex items-center px-4 shrink-0 shadow-sm">
            <span className="material-symbols-outlined mr-2">smart_toy</span>
            <div className="flex flex-col">
              <span className="font-bold text-[14px]">MCP Assistant</span>
              <span className="text-[10px] opacity-80">Powered by Groq LLM</span>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-surface">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg leading-relaxed ${
                  msg.role === 'user' ? 'bg-primary text-on-primary rounded-br-none' : 'bg-surface-container text-on-surface rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] p-3 rounded-lg bg-surface-container text-on-surface rounded-bl-none italic opacity-60">
                  Assistant is typing...
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="shrink-0 p-3 bg-surface-container-high border-t border-[0.5px] border-outline-variant/30">
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                placeholder="Ask me anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="w-full h-[40px] pl-4 pr-12 rounded-full bg-surface text-on-surface border border-outline-variant/50 focus:outline-none focus:border-primary placeholder:text-outline/70"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="absolute right-1.5 top-1.5 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
