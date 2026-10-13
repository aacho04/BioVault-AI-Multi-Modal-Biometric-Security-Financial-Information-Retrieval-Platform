import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  X, 
  Minimize2, 
  Maximize2, 
  RefreshCw 
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "What happens if face authentication fails?",
  "How does the 5-hour security lockout work?",
  "What is the Euclidean distance threshold?",
  "How do I update my security PIN?",
  "What is the emergency security hotline?"
];

export default function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! How can I help you today with your BioVault account, biometric security, or transactions?",
      citations: [],
      evidence: [],
      provider: "BioVault Grounded RAG",
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievalMode, setRetrievalMode] = useState('hybrid'); // 'hybrid', 'bm25', 'semantic'
  const [kbStatus, setKbStatus] = useState(null);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ir/chatbot/status');
      if (res.ok) {
        const data = await res.json();
        setKbStatus(data);
      }
    } catch (e) {
      console.warn('Chatbot status fetch error:', e);
    }
  };

  const handleSend = async (queryToSend = null) => {
    const q = (queryToSend || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsgId = 'u_' + Date.now();
    const userMsg = {
      id: userMsgId,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setIsLoading(true);

    try {
      // Build history for RAG context
      const historyContext = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await fetch('/api/ir/chatbot/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          retrieval_mode: retrievalMode,
          top_k: 4,
          history: historyContext
        })
      });

      if (!res.ok) {
        throw new Error(`Gateway returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg = {
        id: 'b_' + Date.now(),
        role: 'assistant',
        text: data.answer || "No response received.",
        citations: data.citations || [],
        evidence: data.evidence || [],
        confidence: data.confidence || 0.95,
        provider: data.provider || "BioVault Grounded RAG",
        retrieval_mode: data.retrieval_mode || retrievalMode,
        elapsed_ms: data.elapsed_ms || 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('Chatbot error:', err);
      const errMsg = {
        id: 'b_' + Date.now(),
        role: 'assistant',
        text: "⚠️ **System Notification**: The AI Engine microservice is currently processing or initializing at port 8000. Please ensure the backend services are running.",
        citations: [],
        evidence: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        role: 'assistant',
        text: "Conversation cleared. Feel free to ask about BioVault-AI policies, face recognition benchmarks, or emergency protocols.",
        citations: [],
        evidence: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const renderFormattedText = (text) => {
    // Quick inline formatter for bolding, bullet points, and quotes
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const isQuote = line.trim().startsWith('>');
      
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.4); padding: 2px 5px; border-radius: 4px; font-size: 0.85em; color: #38bdf8;">$1</code>');

      if (isQuote) {
        return (
          <div 
            key={idx} 
            style={{ 
              margin: '0.4rem 0', 
              padding: '0.45rem 0.75rem', 
              background: 'rgba(6, 182, 212, 0.1)', 
              borderLeft: '3px solid #06b6d4', 
              borderRadius: '0 8px 8px 0',
              fontSize: '0.85rem'
            }}
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^>\s*/, '') }}
          />
        );
      }

      if (isBullet) {
        return (
          <div 
            key={idx} 
            style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', margin: '0.25rem 0', paddingLeft: '0.35rem' }}
          >
            <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[•\-]\s*/, '') }} />
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} style={{ height: '0.4rem' }} />;
      }

      return (
        <p key={idx} style={{ margin: '0.2rem 0' }} dangerouslySetInnerHTML={{ __html: formattedLine }} />
      );
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #0891b2 0%, #0284c7 100%)',
            color: '#fff',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 30px rgba(6, 182, 212, 0.45)',
            cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
          className="hover:scale-105"
        >
          <div style={{ position: 'relative' }}>
            <Bot size={20} />
            <span style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }} />
          </div>
          <span>Ask BioVault AI</span>
        </button>
      )}

      {/* Floating Chat Modal / Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isExpanded ? '20px' : '24px',
            right: isExpanded ? '20px' : '24px',
            width: isExpanded ? 'calc(100vw - 40px)' : '420px',
            maxWidth: isExpanded ? '850px' : '440px',
            height: isExpanded ? 'calc(100vh - 40px)' : '600px',
            maxHeight: '90vh',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            background: '#090d16',
            border: '1px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '18px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(6, 182, 212, 0.2)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            transition: 'width 0.3s ease, height 0.3s ease, max-width 0.3s ease'
          }}
        >
          {/* Clean Minimalist Header */}
          <div style={{
            padding: '0.9rem 1.15rem',
            background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.8))',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                position: 'relative',
                background: 'linear-gradient(135deg, #06b6d4, #0284c7)',
                padding: '0.45rem',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)'
              }}>
                <Bot size={18} color="#041019" />
                <span style={{
                  position: 'absolute',
                  bottom: -1,
                  right: -1,
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  border: '1.5px solid #090d16'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                  BioVault Assistant
                </div>
                <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>● Online</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <button
                onClick={handleClearHistory}
                title="Restart chat"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Carousel */}
          <div style={{
            padding: '0.5rem 0.85rem',
            background: 'rgba(15, 23, 42, 0.35)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            gap: '0.4rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                className="hover:border-cyan-400"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  maxWidth: '92%',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: msg.role === 'user' 
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : 'linear-gradient(135deg, #06b6d4, #0284c7)',
                    boxShadow: msg.role === 'user' 
                      ? '0 0 10px rgba(99, 102, 241, 0.3)'
                      : '0 0 10px rgba(6, 182, 212, 0.3)'
                  }}>
                    {msg.role === 'user' ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>U</span>
                    ) : (
                      <Bot size={15} color="#041019" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div style={{
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                      : 'rgba(15, 23, 42, 0.75)',
                    border: `1px solid ${msg.role === 'user' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                    padding: '0.75rem 0.95rem',
                    fontSize: '0.86rem',
                    color: '#f8fafc',
                    lineHeight: 1.5,
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}>
                    {renderFormattedText(msg.text)}
                  </div>
                </div>

                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '3px', marginRight: msg.role === 'user' ? '40px' : 0, marginLeft: msg.role === 'assistant' ? '40px' : 0 }}>
                  {msg.timestamp} {msg.elapsed_ms ? `• ${msg.elapsed_ms}ms` : ''}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#06b6d4', fontSize: '0.8rem' }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={14} className="animate-spin" />
                </div>
                <span>Synthesizing answer from Customer Manual...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(10, 15, 26, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about BioVault authentication, policies, lockouts..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#070d18',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '0.6rem 0.9rem',
                fontSize: '0.85rem',
                color: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#06b6d4'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)'}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              style={{
                background: inputQuery.trim() && !isLoading ? 'linear-gradient(135deg, #06b6d4, #0284c7)' : 'rgba(255, 255, 255, 0.05)',
                color: inputQuery.trim() && !isLoading ? '#041019' : '#64748b',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 0.9rem',
                cursor: inputQuery.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
