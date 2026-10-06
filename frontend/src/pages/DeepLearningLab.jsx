import React, { useState } from 'react';
import { Cpu, Eye, Activity, ShieldCheck, Car, Image as ImageIcon, Sliders, Play, CheckCircle } from 'lucide-react';

export default function DeepLearningLab() {
  const [activeModule, setActiveModule] = useState('rnn'); // 'rnn', 'lstm', 'autoencoders', 'case-studies'

  // RNN state
  const [spectralRadius, setSpectralRadius] = useState(0.85);
  const [gradientTrace, setGradientTrace] = useState(null);
  const [unfoldedTrace, setUnfoldedTrace] = useState(null);

  // Autoencoders state
  const [daeResult, setDaeResult] = useState(null);
  const [vaeResult, setVaeResult] = useState(null);
  const [compressionResult, setCompressionResult] = useState(null);

  // Case Studies state
  const [selfDrivingResult, setSelfDrivingResult] = useState(null);
  const [imageCaptionResult, setImageCaptionResult] = useState(null);

  // Test RNN Unfolding
  const runRnnUnfold = async () => {
    try {
      const res = await fetch('/api/ml/rnn/unfold', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      setUnfoldedTrace(data);

      const gradRes = await fetch(`/api/ml/rnn/gradient-analysis?length=20&spectral_radius=${spectralRadius}`);
      const gradData = await gradRes.json();
      setGradientTrace(gradData);
    } catch (e) {
      console.error(e);
    }
  };

  // Test Autoencoders
  const runDae = async () => {
    const res = await fetch('/api/ml/autoencoder/denoise', { method: 'POST' });
    setDaeResult(await res.json());
  };

  const runVae = async () => {
    const res = await fetch('/api/ml/autoencoder/vae', { method: 'POST' });
    setVaeResult(await res.json());
  };

  const runCompression = async () => {
    const res = await fetch('/api/ml/autoencoder/compress', { method: 'POST' });
    setCompressionResult(await res.json());
  };

  // Test Case Studies
  const runSelfDriving = async () => {
    const res = await fetch('/api/ml/case-study/self-driving', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ear_sequence: [0.32, 0.31, 0.28, 0.17, 0.16, 0.19, 0.30, 0.32],
        head_pitch: -6.0
      })
    });
    setSelfDrivingResult(await res.json());
  };

  const runImageCaption = async () => {
    const res = await fetch('/api/ml/case-study/image-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    setImageCaptionResult(await res.json());
  };

  return (
    <div className="container-custom" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div>
        <h2 className="font-heading" style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>
          Deep Learning, Vision & Sequence Intelligence Laboratory
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Interactive Academic Syllabus Demonstrator: Computational Graphs, Gated LSTMs, Autoencoders, and Case Studies.
        </p>
      </div>

      {/* Lab Module Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveModule('rnn')}
          className={`btn-secondary ${activeModule === 'rnn' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeModule === 'rnn' ? '#06b6d4' : undefined }}
        >
          <Activity size={16} /> Chapter 1: RNNs, Graphs & Gradients
        </button>

        <button
          onClick={() => setActiveModule('lstm')}
          className={`btn-secondary ${activeModule === 'lstm' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeModule === 'lstm' ? '#10b981' : undefined }}
        >
          <Eye size={16} /> Chapter 1: LSTM Gating & Liveness
        </button>

        <button
          onClick={() => setActiveModule('autoencoders')}
          className={`btn-secondary ${activeModule === 'autoencoders' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeModule === 'autoencoders' ? '#8b5cf6' : undefined }}
        >
          <Sliders size={16} /> Chapter 2 & Unit V: Autoencoders Suite
        </button>

        <button
          onClick={() => setActiveModule('case-studies')}
          className={`btn-secondary ${activeModule === 'case-studies' ? 'glass-panel-active' : ''}`}
          style={{ borderColor: activeModule === 'case-studies' ? '#f59e0b' : undefined }}
        >
          <Car size={16} /> Unit VI: Self-Driving & Captioning Case Studies
        </button>
      </div>

      {/* Module 1: RNNs & Graphs */}
      {activeModule === 'rnn' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Unfolding Computational Graphs Through Time
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Represents recurrent loops as acyclic computational graphs across time steps t ∈ [1, T].
            </p>

            <button onClick={runRnnUnfold} className="btn-primary" style={{ marginBottom: '1rem' }}>
              <Play size={16} /> Unfold Recurrent Graph & Simulate BPTT
            </button>

            {unfoldedTrace && (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                <div style={{ color: '#38bdf8', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Unfolded Time Steps: {unfoldedTrace.time_steps_unfolded}
                </div>
                {unfoldedTrace.steps.slice(0, 4).map((s, idx) => (
                  <div key={idx} className="font-mono" style={{ color: '#cbd5e1', marginBottom: '0.2rem' }}>
                    t={s.time_step}: ||h_t|| = {s.hidden_state_norm.toFixed(4)} | {s.unfolded_node}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              Vanishing vs. Exploding Gradient Simulation
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Adjust spectral radius ρ: If ρ &lt; 1 gradients vanish exponentially; if ρ &gt; 1 gradients explode.
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Spectral Radius: {spectralRadius}</label>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={spectralRadius}
                onChange={(e) => setSpectralRadius(Number(e.target.value))}
                style={{ width: '100%', marginTop: '0.35rem' }}
              />
            </div>

            {gradientTrace && (
              <div style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: spectralRadius < 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${spectralRadius < 1 ? '#ef4444' : '#f59e0b'}`
              }}>
                <div style={{ fontWeight: 600, color: spectralRadius < 1 ? '#fca5a5' : '#fcd34d' }}>
                  Phenomenon: {gradientTrace.phenomenon}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '0.35rem' }}>
                  Mitigation: {gradientTrace.mitigation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module 2: LSTM & Liveness */}
      {activeModule === 'lstm' && (
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            LSTM Selective Read, Write & Forget Gates (CEC Error Carousel)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
            Mitigates vanishing gradients via the linear cell state C_t governed by selective gates:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '0.35rem' }}>1. Selective Forget Gate</div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                f_t = σ(W_f · [h_{'{t-1}'}, x_t] + b_f)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Decides which historical facial landmark states to discard.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#10b981', marginBottom: '0.35rem' }}>2. Selective Write Gate</div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                i_t = σ(W_i · [h_{'{t-1}'}, x_t] + b_i)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Quantifies new Eye Aspect Ratio (EAR) blink acceleration.
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#06b6d4', marginBottom: '0.35rem' }}>3. Selective Read Gate</div>
              <div className="font-mono" style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>
                o_t = σ(W_o · [h_{'{t-1}'}, x_t] + b_o)
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Generates the output hidden state h_t = o_t ⊙ tanh(C_t).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Module 3: Autoencoders */}
      {activeModule === 'autoencoders' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          
          {/* DAE */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              Denoising Autoencoder (DAE)
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Injects Gaussian noise x̃ = x + N(0, σ²) to model low-light webcam frames and restores pristine coordinates.
            </p>
            <button onClick={runDae} className="btn-secondary" style={{ width: '100%', marginBottom: '0.75rem' }}>
              Run DAE Reconstruction
            </button>
            {daeResult && (
              <div style={{ fontSize: '0.75rem', color: '#34d399', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                PSNR Quality: {daeResult.psnr_db} dB | Loss: {daeResult.reconstruction_loss}
              </div>
            )}
          </div>

          {/* VAE */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              Variational Autoencoder (VAE)
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Reparameterization Trick: z = μ + σ ⊙ ε allows backpropagation through Gaussian distributions.
            </p>
            <button onClick={runVae} className="btn-secondary" style={{ width: '100%', marginBottom: '0.75rem' }}>
              Sample Reparameterized VAE
            </button>
            {vaeResult && (
              <div style={{ fontSize: '0.75rem', color: '#c084fc', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                KL-Divergence: {vaeResult.kl_divergence.toFixed(4)} | ELBO Loss: {vaeResult.total_elbo_loss.toFixed(4)}
              </div>
            )}
          </div>

          {/* Image Compression */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <h4 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.35rem' }}>
              Image & Biometric Compression
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Quantizes 128-D Euclidean biometric descriptors into an 8-bit quantized bottleneck.
            </p>
            <button onClick={runCompression} className="btn-secondary" style={{ width: '100%', marginBottom: '0.75rem' }}>
              Evaluate Compression
            </button>
            {compressionResult && (
              <div style={{ fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                Savings: {compressionResult.storage_savings_percent}% | Fidelity: {compressionResult.reconstruction_fidelity * 100}%
              </div>
            )}
          </div>

        </div>
      )}

      {/* Module 4: Case Studies */}
      {activeModule === 'case-studies' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          
          {/* Self-Driving Vehicles Case Study */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Car size={20} color="#f59e0b" />
              <h4 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Case Study: Self-Driving Vehicles
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Driver Vigilance (PERCLOS) & Vehicle Trajectory Forecasting via unfolded Recurrent Neural Network.
            </p>
            <button onClick={runSelfDriving} className="btn-primary" style={{ marginBottom: '1rem' }}>
              Run In-Cabin Vigilance & Trajectory Model
            </button>

            {selfDrivingResult && (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div style={{ color: '#f59e0b', fontWeight: 600 }}>
                  Driver Status: {selfDrivingResult.driver_vigilance.driver_state} (PERCLOS: {selfDrivingResult.driver_vigilance.perclos_score})
                </div>
                <div style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
                  Action: {selfDrivingResult.driver_vigilance.safety_action}
                </div>
                <div style={{ color: '#38bdf8', marginTop: '0.5rem' }}>
                  Trajectory: {selfDrivingResult.autonomous_trajectory.curvature_classification} ({selfDrivingResult.autonomous_trajectory.forecast_horizon_seconds}s horizon)
                </div>
              </div>
            )}
          </div>

          {/* Automatic Image Captioning Case Study */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <ImageIcon size={20} color="#06b6d4" />
              <h4 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                Case Study: Automatic Image Captioning
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
              CNN-Encoder (visual feature map) + LSTM-Decoder (generating sequential descriptive tokens).
            </p>
            <button onClick={runImageCaption} className="btn-primary" style={{ marginBottom: '1rem' }}>
              Generate Visual Description from CNN Features
            </button>

            {imageCaptionResult && (
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                <div style={{ color: '#34d399', fontWeight: 600 }}>
                  Generated Caption: "{imageCaptionResult.natural_language_caption}"
                </div>
                <div style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
                  Architecture: {imageCaptionResult.model_architecture}
                </div>
                <div style={{ color: '#c084fc', marginTop: '0.25rem' }}>
                  BLEU Score Estimate: {imageCaptionResult.bleu_score_estimate}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
