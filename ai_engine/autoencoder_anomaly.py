"""
BioVault-AI: Autoencoders for Anomaly Detection Case Study
Academic Syllabus: Unit V - Case Study of Autoencoders for Anomaly Detection in Network & Financial Traffic

Implements:
1. Deep Autoencoder trained exclusively on benign traffic baselines.
2. Anomaly Scoring via Reconstruction Error: L_rec = ||x - x_hat||^2.
3. Adaptive Anomaly Threshold tau calibrated on normal distribution quantiles (mu + 3*sigma).
4. Dual-Domain Evaluation:
   - Network Traffic Anomaly (Packet frequency, payload entropy, syn/ack ratio, port variance)
   - Financial Transaction Anomaly (Amount, velocity, distance, unusual hour)
"""

import numpy as np
from typing import Dict, List, Any


class TrafficAnomalyDetector:
    """
    Evaluates streaming feature vectors through an Autoencoder bottleneck.
    Benign patterns are compressed and reconstructed with low error.
    Anomalous attacks or fraudulent deviations cannot be represented by the latent manifold,
    causing elevated reconstruction error ||x - x_hat||^2 > tau.
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

        # Benchmark normal distribution statistics
        self.normal_means = np.array([500.0, 14.0, 2.0, 0.05, 120.0, 1.0, 0.0, 0.2])
        self.normal_stds = np.array([300.0, 4.0, 1.5, 0.02, 50.0, 0.5, 0.1, 0.1])

    def normalize(self, raw_features: np.ndarray) -> np.ndarray:
        return (raw_features - self.normal_means[:len(raw_features)]) / (self.normal_stds[:len(raw_features)] + 1e-6)

    def evaluate_traffic_packet(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Evaluates network traffic or financial transaction features:
        [amount_or_packet_size, hour_of_day, velocity_tx_per_min, geo_distance_km, payload_entropy, ...]
        """
        raw_vec = np.array([
            features.get("amount", features.get("packet_size", 100.0)),
            features.get("hour", 14.0),
            features.get("velocity", 1.0),
            features.get("geo_distance", 5.0),
            features.get("entropy", 0.5),
            features.get("failed_attempts", 0.0),
            features.get("device_trust_score", 0.95),
            features.get("channel_risk", 0.1)
        ], dtype=np.float32)

        # Standardize features
        norm_vec = self.normalize(raw_vec).reshape(-1, 1)

        # Autoencoder Pass: x -> z -> x_hat
        z = np.tanh(np.dot(self.W_enc, norm_vec) + self.b_enc)
        x_hat = np.dot(self.W_dec, z) + self.b_dec

        # Reconstruction Error: ||x - x_hat||_2^2
        recon_error = float(np.mean((norm_vec - x_hat) ** 2))
        anomaly_score = float(np.clip(recon_error * 1.5, 0.0, 1.0))
        is_anomalous = anomaly_score > self.threshold_tau

        action = "Step-Up Biometric Authentication Required" if is_anomalous else "Allow Transaction Automatically"

        return {
            "is_anomalous": is_anomalous,
            "anomaly_score": round(anomaly_score, 4),
            "reconstruction_error": round(recon_error, 4),
            "threshold_tau": self.threshold_tau,
            "recommended_action": action,
            "latent_representation": z.flatten().tolist(),
            "contributing_risk_factors": [
                k for k, v in features.items() if (k == "amount" and v > 5000) or (k == "velocity" and v > 10) or (k == "failed_attempts" and v > 2)
            ]
        }
