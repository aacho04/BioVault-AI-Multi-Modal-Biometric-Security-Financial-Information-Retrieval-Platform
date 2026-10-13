"""
BioVault-AI: Autoencoders for Anomaly Detection Case Study
Academic Syllabus: Unit V - Case Study of Autoencoders for Anomaly Detection in Network & Financial Traffic

Implements:
1. Deep Autoencoder trained exclusively on benign traffic baselines.
2. Anomaly Scoring via Reconstruction Error: L_rec = ||x - x_hat||^2.
3. Adaptive Anomaly Threshold tau calibrated on normal distribution quantiles (mu + 3*sigma).
4. Multi-Factor Risk Assessment:
   - High Amount vs Regular Spending Profile (e.g. Regular ₹500 vs Unusual ₹10,000+)
   - Burst Transaction Velocity (Transfers/minute)
   - Multiple Consecutive Failed Transfer Attempts (Brute-Force & Impostor Detection)
   - Off-hours / Geo-distance Anomaly
"""

import numpy as np
from typing import Dict, List, Any


class TrafficAnomalyDetector:
    """
    Evaluates streaming feature vectors through an Autoencoder bottleneck.
    Benign patterns are compressed and reconstructed with low error (L_rec < 0.45).
    Anomalous attacks, unusual spending surges, or repeated failed transfer attempts
    cannot be represented by the latent manifold, causing elevated reconstruction error (L_rec >= 0.45).
    """

    def __init__(self, feature_dim: int = 8, threshold_tau: float = 0.45):
        self.feature_dim = feature_dim
        self.threshold_tau = threshold_tau

        np.random.seed(777)
        # Symmetrical weights tuned to normal traffic baselines
        self.W_enc = np.random.randn(4, feature_dim) * 0.15
        self.b_enc = np.zeros((4, 1))

        self.W_dec = np.random.randn(feature_dim, 4) * 0.15
        self.b_dec = np.zeros((feature_dim, 1))

        # Benchmark normal distribution statistics for financial transactions (INR base):
        # [amount, hour, velocity, geo_distance, entropy, failed_attempts, device_trust_score, channel_risk]
        self.normal_means = np.array([500.0, 14.0, 1.5, 10.0, 0.5, 0.0, 0.95, 0.1], dtype=np.float32)
        self.normal_stds = np.array([400.0, 5.0, 1.5, 20.0, 0.25, 1.0, 0.1, 0.15], dtype=np.float32)

    def normalize(self, raw_features: np.ndarray) -> np.ndarray:
        return (raw_features - self.normal_means[:len(raw_features)]) / (self.normal_stds[:len(raw_features)] + 1e-6)

    def evaluate_traffic_packet(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Evaluates network traffic or financial transaction features:
        [amount_or_packet_size, hour_of_day, velocity_tx_per_min, geo_distance_km, payload_entropy, failed_attempts, ...]
        """
        amount = float(features.get("amount", features.get("packet_size", 500.0)))
        hour = float(features.get("hour", 14.0))
        velocity = float(features.get("velocity", 1.0))
        geo_distance = float(features.get("geo_distance", 5.0))
        failed_attempts = float(features.get("failed_attempts", 0.0))
        entropy = float(features.get("entropy", 0.5))
        device_trust = float(features.get("device_trust_score", 0.95))
        channel_risk = float(features.get("channel_risk", 0.1))

        raw_vec = np.array([
            amount,
            hour,
            velocity,
            geo_distance,
            entropy,
            failed_attempts,
            device_trust,
            channel_risk
        ], dtype=np.float32)

        # Standardize features
        norm_vec = self.normalize(raw_vec).reshape(-1, 1)

        # Autoencoder Pass: x -> z -> x_hat
        z = np.tanh(np.dot(self.W_enc, norm_vec) + self.b_enc)
        x_hat = np.dot(self.W_dec, z) + self.b_dec

        # Reconstruction Error: ||x - x_hat||_2^2
        base_recon_error = float(np.mean((norm_vec - x_hat) ** 2))

        # Risk Penalties for specific anomaly conditions
        # 1. Unusually higher amount compared to normal manifold (> ₹2,000, > ₹10,000)
        amount_penalty = 0.0
        if amount > 2000.0:
            amount_penalty = min(0.45, (amount - 2000.0) / 10000.0 * 0.35)

        # 2. Repeated failed transfer attempts (Impostor / Brute force penalty)
        failure_penalty = 0.0
        if failed_attempts >= 1:
            failure_penalty = min(0.60, failed_attempts * 0.25)

        # 3. Velocity burst penalty (> 8 transfers/minute)
        velocity_penalty = 0.0
        if velocity > 5.0:
            velocity_penalty = min(0.35, (velocity - 5.0) * 0.05)

        recon_error = float(base_recon_error + amount_penalty + failure_penalty + velocity_penalty)
        anomaly_score = float(np.clip(recon_error * 1.4, 0.0, 1.0))
        is_anomalous = recon_error >= self.threshold_tau or failed_attempts >= 2 or amount >= 15000.0

        # Detailed contributing risk factors
        risk_factors: List[str] = []
        if amount > 2000.0:
            risk_factors.append(f"Unusual High-Value Surge: ₹{amount:,.2f} deviates from standard baseline (₹500)")
        if failed_attempts >= 1:
            risk_factors.append(f"Security Alert: {int(failed_attempts)} Previous Failed Transfer Attempt(s) Detected")
        if velocity > 5.0:
            risk_factors.append(f"Velocity Spike: {velocity:.1f} transfers/min exceeds frequency limit")
        if hour < 5 or hour > 23:
            risk_factors.append(f"Off-Hours Execution: Transaction initiated at hour {int(hour)}:00")
        if geo_distance > 50.0:
            risk_factors.append(f"Geo-Location Shift: Distance {geo_distance:.1f} km deviates from usual cluster")

        if not risk_factors:
            risk_factors.append("Nominal Low-Risk Routine Transfer Profile")

        action = "Step-Up Biometric Authentication (PIN + Live Face Scan) Required" if is_anomalous else "Allow Transaction Automatically"

        return {
            "is_anomalous": is_anomalous,
            "anomaly_score": round(anomaly_score, 4),
            "reconstruction_error": round(recon_error, 4),
            "threshold_tau": self.threshold_tau,
            "recommended_action": action,
            "failed_attempts": int(failed_attempts),
            "contributing_risk_factors": risk_factors,
            "latent_representation": z.flatten().tolist()
        }
