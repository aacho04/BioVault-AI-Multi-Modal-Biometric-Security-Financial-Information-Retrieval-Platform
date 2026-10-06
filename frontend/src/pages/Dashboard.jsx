import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldAlert, ArrowUpRight, TrendingUp, Sparkles, CheckCircle2, AlertOctagon, BarChart3, Layers } from 'lucide-react';

export default function Dashboard({ onRequireStepUpAuth }) {
  const [balance, setBalance] = useState(148520.50);
  const [transactions, setTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [gmmCluster, setGmmCluster] = useState(null);

  // Transfer simulation state
  const [amount, setAmount] = useState('250.00');
  const [merchant, setMerchant] = useState('Global Treasury Bond Allocation');
  const [velocity, setVelocity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState(null);

  // Load transactions and recommendations on mount
  useEffect(() => {
    fetchTransactions();
    fetchRecommendations();
    evaluateGmm(Number(amount));
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions/history');
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/ir/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_biovault_01',
          risk_preferences: { max_risk_tolerance: 6.5, target_return: 10.0, volatility_tolerance: 5.0 },
          constraints: { hard_risk_limit: 8.0, max_lockup_days: 60 }
        })
      });
      const data = await res.json();
      if (data.top_recommendations) setRecommendations(data.top_recommendations);
    } catch (e) {
      console.error('Failed to fetch recommendations:', e);
    }
  };

  const evaluateGmm = async (val) => {
    try {
      const res = await fetch(`/api/ml/gmm-clusters?amount=${val}`);
      const data = await res.json();
      setGmmCluster(data);
    } catch (e) {
      console.error('Failed to evaluate GMM:', e);
    }
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    const num = Number(e.target.value);
    if (!isNaN(num) && num > 0) {
      evaluateGmm(num);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAnomalyResult(null);

    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(amount),
          merchant,
          velocity: Number(velocity),
          hour: new Date().getHours()
        })
      });
      const data = await res.json();
      setAnomalyResult(data.anomalyEvaluation);

      if (data.anomalyEvaluation?.is_anomalous) {
        // Trigger Step-Up Biometrics challenge
        if (onRequireStepUpAuth) onRequireStepUpAuth();
      } else {
        setBalance(prev => prev - Number(amount));
      }

      fetchTransactions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container-custom" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        
        {/* Account Balance Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vault Available Liquidity
            </span>
            <DollarSign size={20} color="#06b6d4" />
          </div>
          <div className="font-heading" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#fff' }}>
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="badge badge-emerald">Tier-4 Biometric Verified</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FIDO2 Hardware Bound</span>
          </div>
        </div>

        {/* Deep Autoencoder Screening Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Autoencoder Reconstruction Loss
            </span>
            <ShieldAlert size={20} color="#10b981" />
          </div>
          <div className="font-heading" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10b981' }}>
            L_rec &lt; 0.45 τ
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Deep Autoencoder continuously screens transactions: Score(x) = ||x - x̂||²
          </p>
        </div>

        {/* GMM Spending Cluster Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              GMM Spending Affinity
            </span>
            <Layers size={20} color="#8b5cf6" />
          </div>
          <div className="font-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#c084fc' }}>
            {gmmCluster?.cluster_label || 'Multi-Modal Cluster Analysis'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Expectation-Maximization probability density: {gmmCluster ? `${(gmmCluster.cluster_affinity_probability * 100).toFixed(1)}% responsibility` : 'Evaluating...'}
          </p>
        </div>

      </div>

      {/* Main Grid: Transfer Form & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        
        {/* Transaction Clearing & Autoencoder Screening Simulator */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <ArrowUpRight size={22} color="#06b6d4" />
            <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
              Simulate Secure Transfer Screening
            </h3>
          </div>

          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Transfer Amount ($ USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Recipient / Allocation Entity
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Transaction Velocity Frequency (Transactions / Min)
              </label>
              <input
                type="number"
                value={velocity}
                onChange={(e) => setVelocity(e.target.value)}
                min="1"
                max="25"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem'
                }}
              />
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Tip: Enter amount &gt; $5,000 or velocity &gt; 10 to test the Autoencoder Anomaly trigger!
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ marginTop: '0.5rem', justifyContent: 'center' }}
            >
              {isSubmitting ? 'Evaluating Autoencoder...' : 'Execute & Screen Transfer'}
            </button>
          </form>

          {/* Anomaly Result Callout */}
          {anomalyResult && (
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: '10px',
              background: anomalyResult.is_anomalous ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${anomalyResult.is_anomalous ? '#ef4444' : '#10b981'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: anomalyResult.is_anomalous ? '#ef4444' : '#34d399' }}>
                {anomalyResult.is_anomalous ? <AlertOctagon size={18} /> : <CheckCircle2 size={18} />}
                {anomalyResult.is_anomalous ? 'ANOMALY DETECTED (High Risk Deviation)' : 'BENIGN TRANSACTION VERIFIED'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                Reconstruction Loss: <strong>{anomalyResult.reconstruction_error}</strong> (Threshold τ = 0.45).
                Action: {anomalyResult.recommended_action}.
              </p>
            </div>
          )}
        </div>

        {/* Hybrid Investment Recommender (Collaborative + Content + Knowledge) */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Sparkles size={22} color="#8b5cf6" />
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Hybrid Wealth Recommender
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Collaborative Matrix Factorization + Content Risk Cosine + Knowledge Rules
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations.map(asset => (
              <div
                key={asset.asset_id}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{asset.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {asset.category} • Risk Grade: {asset.risk_rating}/10
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                    {(asset.hybrid_match_score * 100).toFixed(1)}% Match
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem' }}>
                    Return: {asset.expected_return}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Transaction History Ledger */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BarChart3 size={20} color="#06b6d4" />
          <h3 className="font-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            Audited Financial Transaction Ledger
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem' }}>Transaction ID</th>
                <th style={{ padding: '0.75rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem' }}>Merchant / Category</th>
                <th style={{ padding: '0.75rem' }}>Amount</th>
                <th style={{ padding: '0.75rem' }}>Autoencoder L_rec</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td className="font-mono" style={{ padding: '0.75rem', color: '#38bdf8' }}>{tx.id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.75rem', color: '#f8fafc' }}>{tx.merchant}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>${Number(tx.amount).toFixed(2)}</td>
                  <td className="font-mono" style={{ padding: '0.75rem', color: tx.reconstructionError > 0.45 ? '#ef4444' : '#10b981' }}>
                    {tx.reconstructionError}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${tx.reconstructionError > 0.45 ? 'badge-amber' : 'badge-emerald'}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
