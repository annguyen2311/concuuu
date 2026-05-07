import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function AiAssistant({ language = 'vi' }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const copy = language === 'en' ? {
    title: 'AI Assistant',
    placeholder: 'Type a message...',
    send: 'Send',
    thinking: 'Thinking...',
    error: 'Error connecting to AI',
    greeting: 'Hi! I\'m your AI assistant. Ask me anything about the server.',
  } : {
    title: 'Trợ lý AI',
    placeholder: 'Nhập tin nhắn...',
    send: 'Gửi',
    thinking: 'Đang suy nghĩ...',
    error: 'Lỗi kết nối AI',
    greeting: 'Xin chào! Tôi là trợ lý AI. Hãy hỏi tôi bất cứ điều gì về server.',
  };

  useEffect(() => {
    if (!open) return undefined;

    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 200);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
      });
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
      {/* Floating AI entry point */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="ai-toggle-tab"
        title={copy.title}
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          transform: 'none',
          zIndex: 1001,
          width: '60px',
          height: '60px',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          color: '#fff',
          border: 'none',
          borderRadius: '999px',
          cursor: 'pointer',
          fontSize: '18px',
          fontWeight: 900,
          boxShadow: '0 18px 42px rgba(37, 99, 235, 0.34)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease',
          writingMode: 'horizontal-tb',
        }}
      >
        AI
      </button>

      {/* Backdrop on mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 999,
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: open ? '0' : '-320px',
          bottom: 0,
          width: '320px',
          maxWidth: '85vw',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--surface-elevated, #fff)',
          borderLeft: '1px solid var(--border-color, #e2e8f0)',
          boxShadow: open ? '-4px 0 24px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
          color: '#fff',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '20px' }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: '15px', flex: 1 }}>{copy.title}</span>
          <button
            type="button"
            onClick={() => setMessages([])}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {messages.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: '12px',
              opacity: 0.6,
            }}>
              <span style={{ fontSize: '40px' }}>🤖</span>
              <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', textAlign: 'center', lineHeight: 1.5 }}>
                {copy.greeting}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                fontSize: '13px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                ...(msg.role === 'user'
                  ? { background: 'var(--accent, #2563eb)', color: '#fff' }
                  : { background: 'var(--surface-muted, #f1f5f9)', color: 'var(--text-primary, #1e293b)' }
                ),
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'var(--surface-muted, #f1f5f9)',
                color: 'var(--text-muted, #94a3b8)',
                padding: '10px 14px',
                borderRadius: '14px 14px 14px 4px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span className="ai-typing-dots">
                  <span>●</span><span>●</span><span>●</span>
                </span>
                {copy.thinking}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--border-color, #e2e8f0)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={copy.placeholder}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #e2e8f0)',
                background: 'var(--surface-muted, #f8fafc)',
                color: 'var(--text-primary, #1e293b)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--accent, #2563eb)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: (loading || !input.trim()) ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ai-typing-dots span {
          animation: ai-dot-blink 1.4s infinite;
          font-size: 8px;
          margin-right: 2px;
        }
        .ai-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .ai-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes ai-dot-blink {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
        @media (max-width: 768px) {
          .ai-toggle-tab {
            right: 16px !important;
            bottom: calc(5rem + env(safe-area-inset-bottom, 0px)) !important;
            height: 56px !important;
            width: 56px !important;
            border-radius: 999px !important;
            font-size: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
