import React from 'react';
import { ShieldCheck, Cpu, Search, LayoutDashboard, KeyRound, Terminal } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth, isAuthenticated, user }) {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '1rem 2rem' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(16, 185, 129, 0.2))',
            border: '1px solid rgba(6, 182, 212, 0.4)',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={26} color="#06b6d4" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fff' }}>
                BIOVAULT<span style={{ color: '#06b6d4' }}>.AI</span>
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>ENTERPRISE SECURE</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Multi-Modal Biometrics & Financial IR Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn-secondary ${activeTab === 'dashboard' ? 'glass-panel-active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderColor: activeTab === 'dashboard' ? '#06b6d4' : undefined,
              color: activeTab === 'dashboard' ? '#38bdf8' : undefined
            }}
          >
            <LayoutDashboard size={16} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('dl-lab')}
            className={`btn-secondary ${activeTab === 'dl-lab' ? 'glass-panel-active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderColor: activeTab === 'dl-lab' ? '#10b981' : undefined,
              color: activeTab === 'dl-lab' ? '#34d399' : undefined
            }}
          >
            <Cpu size={16} /> Deep Learning Lab
          </button>

          <button
            onClick={() => setActiveTab('ir-search')}
            className={`btn-secondary ${activeTab === 'ir-search' ? 'glass-panel-active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              borderColor: activeTab === 'ir-search' ? '#8b5cf6' : undefined,
              color: activeTab === 'ir-search' ? '#c084fc' : undefined
            }}
          >
            <Search size={16} /> IR Search & Web Graph
          </button>
        </nav>

        {/* Authentication Status Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onOpenAuth}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <KeyRound size={16} />
            {isAuthenticated ? 'Biometrics Verified' : 'Authenticate Face / Passkey'}
          </button>
        </div>
      </div>
    </header>
  );
}
