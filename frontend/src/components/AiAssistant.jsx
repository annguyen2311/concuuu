import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function AiAssistant({ language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState(null);
  const messagesEndRef = useRef(null);

  const copy = language === 'en' ? {
    title: 'AI Assistant',
    placeholder: 'Ask about the server...',
    send: 'Send',
    notConfigured: 'AI not configured. Set API key in Admin Panel.',
    thinking: 'Thinking...',
    error: 'Error connecting to AI',
  } : {
    title: 'Trợ lý AI',
    placeholder: 'Hỏi về server...',
    send: 'Gửi',
    notConfigured: 'AI chưa được cấu hình. Đặt API key trong Admin Panel.',
    thinking: 'Đang suy nghĩ...',
    error: 'Lỗi kết nối AI',
  };

  const authConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    if (open && configured === null) {
      axios.get('/api/ai/config', authConfig()).then((res) => {
        setConfigured(res.data.apiKeySet);
      }).catch(() => setConfigured(false));
    }
  }, [open, configured]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/ai/chat', {
        message: text,
        conversationHistory: messages,
      }, authConfig());
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      const errMsg = err.response?.data?.error || copy.error;
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-2xl text-white shadow-lg shadow-purple-500/30 transition hover:scale-105 md:bottom-6 md:right-6"
        title={copy.title}
      >
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-[var(--shadow-strong)] md:bottom-22 md:right-6">
          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-white">
            <span className="text-lg">🤖</span>
            <span className="font-bold">{copy.title}</span>
            <button type="button" onClick={() => setMessages([])} className="ml-auto text-xs opacity-70 hover:opacity-100">Clear</button>
          </div>

          {/* Messages */}
          <div className="flex h-80 flex-col gap-3 overflow-y-auto p-4">
            {configured === false && (
              <div className="rounded-xl bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">
                {copy.notConfigured}
              </div>
            )}
            {messages.length === 0 && configured && (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
                <div className="text-center">
                  <p className="text-3xl">🤖</p>
                  <p className="mt-2">{copy.title}</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface-muted)] text-[var(--text-primary)]'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-[var(--surface-muted)] px-4 py-2.5 text-sm text-[var(--text-muted)]">
                  {copy.thinking}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border-color)] p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={copy.placeholder}
                disabled={!configured || loading}
                className="input-field flex-1 rounded-xl py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!configured || loading || !input.trim()}
                className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                {copy.send}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
