import React from 'react';
import { ShieldCheck, Cpu, Search, LayoutDashboard, KeyRound, LogOut, Lock, Bot } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth, isAuthenticated, user, onLogout }) {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '0.85rem 2rem' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(16, 185, 129, 0.25))',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={24} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
                BIOVAULT<span style={{ color: '#06b6d4' }}>.AI</span>
              </span>
              <span className={`badge ${isAuthenticated ? 'badge-emerald' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                {isAuthenticated ? 'VAULT UNLOCKED' : 'VAULT LOCKED'}
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Biometric Security & Financial IR Platform</p>
          </div>
        </div>

        {/* Navigation Tabs (Only when authenticated) */}
        {isAuthenticated && (
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`btn-secondary ${activeTab === 'dashboard' ? 'glass-panel-active' : ''}`}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                borderColor: activeTab === 'dashboard' ? '#06b6d4' : undefined,
                color: activeTab === 'dashboard' ? '#38bdf8' : undefined
              }}
            >
              <LayoutDashboard size={15} /> Dashboard
            </button>

            <button
              onClick={() => setActiveTab('dl-lab')}
              className={`btn-secondary ${activeTab === 'dl-lab' ? 'glass-panel-active' : ''}`}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                borderColor: activeTab === 'dl-lab' ? '#10b981' : undefined,
                color: activeTab === 'dl-lab' ? '#34d399' : undefined
              }}
            >
              <Cpu size={15} /> Deep Learning Lab
            </button>

            <button
              onClick={() => setActiveTab('ir-search')}
              className={`btn-secondary ${activeTab === 'ir-search' ? 'glass-panel-active' : ''}`}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                borderColor: activeTab === 'ir-search' ? '#8b5cf6' : undefined,
                color: activeTab === 'ir-search' ? '#c084fc' : undefined
              }}
            >
              <Search size={15} /> IR Search & Graph
            </button>

            <button
              onClick={() => setActiveTab('chatbot')}
              className={`btn-secondary ${activeTab === 'chatbot' ? 'glass-panel-active' : ''}`}
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.85rem',
                borderColor: activeTab === 'chatbot' ? '#06b6d4' : undefined,
                color: activeTab === 'chatbot' ? '#38bdf8' : undefined
              }}
            >
              <Bot size={15} /> AI Chatbot
            </button>
          </nav>
        )}

        {/* User Info & Auth Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated ? (
            <>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.01em' }}>
                  {(() => {
                    const rawStr = user?.email || user?.fullName || 'User';
                    const prefix = rawStr.split('@')[0];
                    const alphaPart = prefix.match(/^[^\d]+/)?.[0]?.replace(/[._-]/g, ' ').trim();
                    if (alphaPart && alphaPart.length > 0) {
                      return alphaPart.charAt(0).toUpperCase() + alphaPart.slice(1);
                    }
                    return prefix;
                  })()}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#10b981' }}>● Biometric Verified</span>
              </div>
              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Lock Vault & Sign Out"
              >
                <Lock size={14} /> Lock Vault
              </button>
            </>
          ) : (
            <button
              onClick={() => onOpenAuth('verify')}
              className="btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              <KeyRound size={16} /> Unlock Vault (Face ID)
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
