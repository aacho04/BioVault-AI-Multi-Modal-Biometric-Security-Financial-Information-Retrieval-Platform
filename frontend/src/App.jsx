import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import DeepLearningLab from './pages/DeepLearningLab';
import IRSearch from './pages/IRSearch';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user, setUser] = useState({
    fullName: 'Alex Vance',
    role: 'Principal Financial Officer',
    trustTier: 'Tier-4 Biometric Verified'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        isAuthenticated={isAuthenticated}
        user={user}
      />

      {/* Main Content Viewport */}
      <main style={{ flex: 1, padding: '1.5rem 0' }}>
        {activeTab === 'dashboard' && (
          <Dashboard onRequireStepUpAuth={() => setIsAuthModalOpen(true)} />
        )}
        {activeTab === 'dl-lab' && <DeepLearningLab />}
        {activeTab === 'ir-search' && <IRSearch />}
      </main>

      {/* Biometric & WebAuthn Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={(userData) => {
          setIsAuthenticated(true);
          if (userData) setUser(userData);
        }}
      />
    </div>
  );
}
