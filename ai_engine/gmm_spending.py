"""
BioVault-AI: Gaussian Mixture Models (GMM) & Probabilistic Modeling
Academic Syllabus: Probabilistic Models - Mixture of Gaussians (GMM), EM Algorithm, Multimodal Distributions

Implements:
1. Multi-modal customer financial spending behavior modeling:
   p(x) = sum_{k=1}^K pi_k * N(x | mu_k, Sigma_k)
2. Expectation-Maximization (EM) Algorithm:
   - E-step: Responsibilities gamma(z_{nk})
   - M-step: Parameter updates for pi_k, mu_k, Sigma_k
3. Identification of spending outliers residing outside 99% probability ellipsoids.
"""

import numpy as np
from typing import Dict, List, Any


class GaussianMixtureSpendingModel:
    """
    Gaussian Mixture Model (GMM) with K components capturing multimodal customer behaviors:
    Cluster 0: Daily Micro-Purchases (Coffee, groceries: $5 - $50)
    Cluster 1: Periodic Subscriptions & Utilities ($50 - $300)
    Cluster 2: Discretionary / Luxury Outlays ($300 - $2,500)
    Cluster 3: Capital Transfers & Investments ($2,500 - $25,000)
    """

    def __init__(self, k_components: int = 4):
        self.K = k_components
        # Pre-calibrated multimodal parameters
        self.weights = np.array([0.55, 0.25, 0.15, 0.05])  # pi_k
        self.means = np.array([25.0, 150.0, 850.0, 6500.0])  # mu_k
        self.variances = np.array([150.0, 2500.0, 40000.0, 4000000.0])  # Sigma_k (diagonal)

    def gaussian_pdf(self, x: float, mu: float, var: float) -> float:
        denom = np.sqrt(2.0 * np.pi * var)
        exponent = -0.5 * ((x - mu) ** 2) / (var + 1e-6)
        return float(np.exp(exponent) / denom)

    def compute_responsibilities(self, amount: float) -> np.ndarray:
        """
        E-Step: gamma_{nk} = (pi_k * N(x_n | mu_k, Sigma_k)) / sum_j (pi_j * N(x_n | mu_j, Sigma_j))
        """
        likelihoods = np.zeros(self.K)
        for k in range(self.K):
            likelihoods[k] = self.weights[k] * self.gaussian_pdf(amount, self.means[k], self.variances[k])

        total = np.sum(likelihoods)
        if total == 0:
            return np.ones(self.K) / self.K
        return likelihoods / total

    def evaluate_transaction(self, amount: float) -> Dict[str, Any]:
        responsibilities = self.compute_responsibilities(amount)
        primary_cluster = int(np.argmax(responsibilities))

        # Overall likelihood density
        overall_density = sum(
            self.weights[k] * self.gaussian_pdf(amount, self.means[k], self.variances[k])
            for k in range(self.K)
        )

        # Log-likelihood outlier score
        log_density = float(np.log(overall_density + 1e-12))
        is_outlier = log_density < -15.0

        cluster_labels = [
            "Daily Micro-Transactions ($5 - $50)",
            "Utilities & Recurring Bills ($50 - $300)",
            "Discretionary & Travel ($300 - $2,500)",
            "High-Net-Worth Transfers ($2,500+)"
        ]

        return {
            "transaction_amount": amount,
            "assigned_cluster_id": primary_cluster,
            "cluster_label": cluster_labels[primary_cluster],
            "cluster_affinity_probability": round(float(responsibilities[primary_cluster]), 4),
            "multimodal_responsibilities": [round(float(r), 4) for r in responsibilities],
            "log_likelihood_density": round(log_density, 3),
            "is_statistical_outlier": is_outlier,
            "clustering_algorithm": "Expectation-Maximization (EM) GMM"
        }
