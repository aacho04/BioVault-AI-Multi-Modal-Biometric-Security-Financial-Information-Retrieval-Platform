"""
BioVault-AI: Hybrid Recommender System
Academic Syllabus: Unit VI - Recommender Systems: Collaborative Filtering, Content-Based Recommendation, Knowledge-Based Recommendation

Implements:
1. Collaborative Filtering:
   - User-Item Interaction Matrix Factorization (R ~ U * V^T)
   - Predicting user affinities based on peer investor behaviors
2. Content-Based Filtering:
   - Cosine Similarity between investor risk profile vectors and asset feature vectors
     Sim(u, i) = (u . i) / (||u|| * ||i||)
3. Knowledge-Based Recommendation:
   - Constraint-based rules ensuring regulatory compliance, ESG criteria, and minimum liquidity
4. Hybrid Ranking Model combining all three paradigms.
"""

import numpy as np
from typing import Dict, List, Any


class HybridFinancialRecommender:
    """
    Synthesizes Collaborative Filtering, Content-Based Filtering,
    and Knowledge-Based Regulatory Constraints to recommend financial assets.
    """

    def __init__(self):
        # Asset Catalog: [AssetID, Name, RiskScore (1-10), ReturnRate (%), Volatility (1-10), MinLiquidityDays]
        self.assets = [
            {"id": "A1", "name": "US Treasury 10-Yr Bond", "category": "Fixed Income", "risk": 2.0, "return": 4.5, "volatility": 1.5, "min_days": 30},
            {"id": "A2", "name": "S&P 500 Index ETF", "category": "Equity Index", "risk": 5.0, "return": 10.2, "volatility": 4.5, "min_days": 1},
            {"id": "A3", "name": "High-Yield Corporate Bond Fund", "category": "Credit", "risk": 6.0, "return": 7.8, "volatility": 5.0, "min_days": 7},
            {"id": "A4", "name": "Clean Energy Infrastructure Fund", "category": "ESG Equities", "risk": 7.5, "return": 12.5, "volatility": 7.0, "min_days": 1},
            {"id": "A5", "name": "Quantitative Crypto Vault", "category": "Alternative", "risk": 9.5, "return": 22.0, "volatility": 9.8, "min_days": 90}
        ]

        # Pretrained Matrix Factorization Latent Factors for CF
        np.random.seed(42)
        self.asset_latent_factors = {
            a["id"]: np.random.randn(4) for a in self.assets
        }

    def collaborative_score(self, user_latent_vector: np.ndarray, asset_id: str) -> float:
        """User-Item Matrix Factorization dot product."""
        v = self.asset_latent_factors[asset_id]
        score = float(np.dot(user_latent_vector, v))
        return float(1.0 / (1.0 + np.exp(-score)))  # Normalized 0-1

    def content_based_score(self, user_risk_profile: Dict[str, float], asset: Dict[str, Any]) -> float:
        """
        Cosine similarity between user risk vector [target_risk, target_return, target_volatility]
        and asset vector.
        """
        u_vec = np.array([
            user_risk_profile.get("max_risk_tolerance", 5.0),
            user_risk_profile.get("target_return", 8.0),
            user_risk_profile.get("volatility_tolerance", 5.0)
        ])
        i_vec = np.array([asset["risk"], asset["return"], asset["volatility"]])

        dot = np.dot(u_vec, i_vec)
        norm_u = np.linalg.norm(u_vec)
        norm_i = np.linalg.norm(i_vec)
        cos_sim = dot / ((norm_u * norm_i) + 1e-6)
        return float(max(0.0, min(1.0, cos_sim)))

    def knowledge_based_filter(self, user_constraints: Dict[str, Any], asset: Dict[str, Any]) -> bool:
        """
        Hard constraint rules:
        - Must not exceed max permissible regulatory risk.
        - Must satisfy liquidity horizon constraints.
        """
        max_allowed_risk = user_constraints.get("hard_risk_limit", 10.0)
        max_lockup_days = user_constraints.get("max_lockup_days", 365)

        if asset["risk"] > max_allowed_risk:
            return False
        if asset["min_days"] > max_lockup_days:
            return False
        return True

    def recommend(self, user_profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Produces top hybrid asset recommendations.
        """
        user_latent = np.array(user_profile.get("latent_factors", [0.4, -0.2, 0.8, 0.1]))
        risk_prefs = user_profile.get("risk_preferences", {"max_risk_tolerance": 6.0, "target_return": 9.0, "volatility_tolerance": 5.0})
        constraints = user_profile.get("constraints", {"hard_risk_limit": 8.0, "max_lockup_days": 60})

        recommendations = []
        for asset in self.assets:
            # 1. Knowledge-based hard check
            passes_rules = self.knowledge_based_filter(constraints, asset)
            if not passes_rules:
                continue

            # 2. Collaborative score
            cf_val = self.collaborative_score(user_latent, asset["id"])

            # 3. Content-based score
            cb_val = self.content_based_score(risk_prefs, asset)

            # 4. Hybrid synthesis: 0.5 * CF + 0.5 * CB
            hybrid_score = 0.5 * cf_val + 0.5 * cb_val

            recommendations.append({
                "asset_id": asset["id"],
                "name": asset["name"],
                "category": asset["category"],
                "hybrid_match_score": round(hybrid_score, 4),
                "collaborative_affinity": round(cf_val, 4),
                "content_risk_similarity": round(cb_val, 4),
                "expected_return": f"{asset['return']}%",
                "risk_rating": asset["risk"]
            })

        recommendations.sort(key=lambda x: x["hybrid_match_score"], reverse=True)

        return {
            "user_id": user_profile.get("user_id", "usr_vault_01"),
            "strategy": "Hybrid (Collaborative Matrix Factorization + Content Cosine + Knowledge Rules)",
            "total_candidates_eligible": len(recommendations),
            "top_recommendations": recommendations
        }
