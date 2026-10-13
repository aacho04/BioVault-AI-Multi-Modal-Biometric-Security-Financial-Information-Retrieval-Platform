import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Search, 
  Cpu, 
  Sliders, 
  Clock, 
  Hash, 
  Terminal,
  Database,
  ExternalLink
} from 'lucide-react';

const SUGGESTIONS = [
  { label: "Lockout Policy", query: "What happens if an account is locked after 3 failed attempts?" },
  { label: "Biometric Threshold", query: "What is the Euclidean distance threshold for biometric face verification?" },
  { label: "PIN Reset", query: "How do I update my 6-digit transaction PIN?" },
  { label: "Customer Hotline", query: "What is the emergency security hotline phone number and email?" },
  { label: "Passkey FIDO2", query: "How does WebAuthn passkey hardware binding work in BioVault-AI?" },
  { label: "180-Day Immutability", query: "What is the 180-day biometric immutability policy?" }
];

export default function AIChatbot() {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      text: "Welcome to the **BioVault-AI Enterprise Assistant & RAG Intelligence Console**.\n\nEvery answer is rigorously grounded in `CUSTOMER_MANUAL.txt` using **Okapi BM25 + Vector Semantic Hybrid IR** with exact section citations. Select a suggested topic below or type your banking and biometric security questions.",
      citations: [{ section_num: "1.0", section_title: "1.0. Platform Overview" }],
      evidence: [],
      provider: "BioVault Grounded RAG",
      confidence: 1.0,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [retrievalMode, setRetrievalMode] = useState('hybrid');
  const [topK, setTopK] = useState(4);
  const [kbStatus, setKbStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat', 'passages', 'ir_diagnostics'
  const [expandedEvidenceIdx, setExpandedEvidenceIdx] = useState(null);
  const [reloadMsg, setReloadMsg] = useState(null);

  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/ir/chatbot/status');
      if (res.ok) {
        const data = await res.json();
        setKbStatus(data);
      }
    } catch (e) {
      console.warn('Status error:', e);
    }
  };

  const reloadKnowledgeBase = async () => {
    setReloadMsg('Reloading & Re-indexing...');
    try {
      const res = await fetch('/api/ir/chatbot/reload', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReloadMsg('Successfully re-indexed!');
        fetchStatus();
      } else {
        setReloadMsg('Failed to reload');
      }
    } catch (e) {
      setReloadMsg('Microservice error');
    }
    setTimeout(() => setReloadMsg(null), 3000);
  };

  const handleSend = async (queryText = null) => {
    const q = (queryText || inputQuery).trim();
    if (!q || isLoading) return;

    const userMsg = {
      id: 'u_' + Date.now(),
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsLoading(true);

    try {
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
          top_k: topK,
          history: historyContext
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const botMsg = {
        id: 'b_' + Date.now(),
        role: 'assistant',
        text: data.answer || "No relevant information found.",
        citations: data.citations || [],
        evidence: data.evidence || [],
        confidence: data.confidence || 0.95,
        provider: data.provider || "BioVault Grounded RAG",
        retrieval_mode: data.retrieval_mode || retrievalMode,
        elapsed_ms: data.elapsed_ms || 0,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'b_' + Date.now(),
          role: 'assistant',
          text: "⚠️ **Service Notice**: AI Engine microservice is warming up or unreachable at port 8000.",
          citations: [],
          evidence: [],
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const isQuote = line.trim().startsWith('>');
      
      let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px; color: #38bdf8;">$1</code>');

      if (isQuote) {
        return (
          <div 
            key={idx} 
            style={{ 
              margin: '0.5rem 0', 
              padding: '0.6rem 0.9rem', 
              background: 'rgba(6, 182, 212, 0.08)', 
              borderLeft: '4px solid #06b6d4', 
              borderRadius: '0 8px 8px 0',
              fontSize: '0.88rem'
            }}
            dangerouslySetInnerHTML={{ __html: formatted.replace(/^>\s*/, '') }}
          />
        );
      }

      if (isBullet) {
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', margin: '0.3rem 0', paddingLeft: '0.5rem' }}>
            <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: formatted.replace(/^[•\-]\s*/, '') }} />
          </div>
        );
      }

      if (!line.trim()) return <div key={idx} style={{ height: '0.4rem' }} />;

      return <p key={idx} style={{ margin: '0.25rem 0' }} dangerouslySetInnerHTML={{ __html: formatted }} />;
    });
  };

  return (
    <div className="container-custom" style={{ paddingBottom: '3rem' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.25))',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            padding: '0.85rem',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)'
          }}>
            <Bot size={28} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#fff' }}>
                Enterprise Banking AI Assistant
              </h1>
              <span className="badge badge-cyan">RAG Grounded</span>
              <span className="badge badge-emerald">Zero-Hallucination</span>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '3px 0 0 0' }}>
              Retrieval-Augmented Generation powered by Okapi BM25, Dense Semantic Vector IR & Customer Manual Grounding
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={reloadKnowledgeBase}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} />
            {reloadMsg || 'Reload Knowledge Base'}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chat, Right Diagnostics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)', gap: '1.5rem' }}>
        
        {/* Left Column: Chat Console */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '720px', overflow: 'hidden' }}>
          
          {/* Sub Header & Mode Controls */}
          <div style={{
            padding: '0.85rem 1.25rem',
            background: 'rgba(0,0,0,0.3)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Layers size={14} color="#06b6d4" /> Retrieval Mode:
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {['hybrid', 'bm25', 'semantic'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setRetrievalMode(mode)}
                    style={{
                      background: retrievalMode === mode ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: retrievalMode === mode ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)',
                      color: retrievalMode === mode ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.75rem',
                      padding: '3px 9px',
                      borderRadius: '6px',
                      border: '1px solid',
                      cursor: 'pointer',
                      fontWeight: retrievalMode === mode ? 600 : 400
                    }}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span>Top-K Passages:</span>
              <select
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                style={{
                  background: '#070d18',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.75rem'
                }}
              >
                <option value={2}>2 Passages</option>
                <option value={4}>4 Passages</option>
                <option value={6}>6 Passages</option>
              </select>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div style={{
            padding: '0.65rem 1rem',
            background: 'rgba(15, 23, 42, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '0.45rem',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {SUGGESTIONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(item.query)}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '0.73rem',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                className="hover:border-cyan-400"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  maxWidth: '88%',
                  flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                      : 'linear-gradient(135deg, #06b6d4, #0284c7)',
                    boxShadow: m.role === 'user'
                      ? '0 0 12px rgba(99, 102, 241, 0.3)'
                      : '0 0 12px rgba(6, 182, 212, 0.3)'
                  }}>
                    {m.role === 'user' ? (
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>U</span>
                    ) : (
                      <Bot size={17} color="#041019" />
                    )}
                  </div>

                  <div style={{
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                      : 'rgba(15, 23, 42, 0.85)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    padding: '0.95rem 1.15rem',
                    fontSize: '0.9rem',
                    color: '#f8fafc',
                    lineHeight: 1.6,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
                  }}>
                    {renderFormattedText(m.text)}

                    {/* Citations Footer */}
                    {m.citations && m.citations.length > 0 && (
                      <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: 600 }}>
                          GROUNDED SOURCE CITATIONS:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {m.citations.map((c, cIdx) => (
                            <span
                              key={cIdx}
                              style={{
                                background: 'rgba(6, 182, 212, 0.12)',
                                border: '1px solid rgba(6, 182, 212, 0.3)',
                                color: '#38bdf8',
                                fontSize: '0.73rem',
                                padding: '2px 8px',
                                borderRadius: '5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <BookOpen size={11} />
                              {c.section_title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', marginRight: m.role === 'user' ? '46px' : 0, marginLeft: m.role === 'assistant' ? '46px' : 0 }}>
                  {m.timestamp} {m.elapsed_ms ? `• Query Latency: ${m.elapsed_ms}ms` : ''}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#06b6d4', fontSize: '0.85rem' }}>
                <Sparkles size={18} className="animate-spin" />
                <span>Searching inverted index & retrieving customer manual excerpts...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <div style={{
            padding: '1rem',
            background: 'rgba(10, 15, 26, 0.98)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem'
          }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask any question about BioVault-AI policies, face thresholds, or account security..."
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#070d18',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '0.7rem 1rem',
                fontSize: '0.88rem',
                color: '#fff',
                outline: 'none'
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputQuery.trim()}
              className="btn-primary"
              style={{
                padding: '0.7rem 1.2rem',
                fontSize: '0.88rem',
                cursor: inputQuery.trim() && !isLoading ? 'pointer' : 'not-allowed'
              }}
            >
              <Send size={16} />
              <span>Ask</span>
            </button>
          </div>
        </div>

        {/* Right Column: Knowledge Base & RAG Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* KB Status Card */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Database size={18} color="#06b6d4" />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Knowledge Base Index</h3>
              </div>
              <span className="badge badge-emerald">ACTIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Passages</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#38bdf8' }}>{kbStatus?.total_passages || 33}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total Corpus Words</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{kbStatus?.total_words || 2150}</div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6 }}>
              <div><strong>Source File:</strong> <code style={{ color: '#38bdf8' }}>CUSTOMER_MANUAL.txt</code></div>
              <div><strong>Okapi BM25 Params:</strong> <code>k1={kbStatus?.bm25_params?.k1 || 1.5}, b={kbStatus?.bm25_params?.b || 0.75}</code></div>
              <div><strong>Avg Document Length:</strong> <code>avgdl={kbStatus?.bm25_params?.avgdl || 65.2} words</code></div>
            </div>
          </div>

          {/* RAG IR Algorithm Breakdown */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Cpu size={18} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Hybrid IR Architecture</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
              <div style={{ padding: '0.65rem', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '8px', borderLeft: '3px solid #06b6d4' }}>
                <strong style={{ color: '#38bdf8' }}>1. Okapi BM25 Lexical Matching:</strong>
                <p style={{ margin: '3px 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                  IDF weight scaling with term frequency saturation curve, favoring exact section keywords like "threshold", "lockout", "0.55".
                </p>
              </div>

              <div style={{ padding: '0.65rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <strong style={{ color: '#34d399' }}>2. Dense Semantic Cosine Space:</strong>
                <p style={{ margin: '3px 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                  L2-normalized TF-IDF vector dot products catching conversational synonyms and query paraphrasing.
                </p>
              </div>

              <div style={{ padding: '0.65rem', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '8px', borderLeft: '3px solid #8b5cf6' }}>
                <strong style={{ color: '#c084fc' }}>3. Grounded Synthesis & Citations:</strong>
                <p style={{ margin: '3px 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>
                  Context is injected with mandatory bracketed chapter citations, preventing external financial hallucination.
                </p>
              </div>
            </div>
          </div>

          {/* Indexed Sections List */}
          <div className="glass-panel" style={{ padding: '1.25rem', flex: 1, overflowY: 'auto', maxHeight: '230px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <BookOpen size={16} color="#c084fc" />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#fff' }}>Indexed Manual Sections</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {kbStatus?.sections?.map((sec, idx) => (
                <div
                  key={idx}
                  style={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}
                >
                  {sec}
                </div>
              )) || (
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading section index...</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
