"""
BioVault-AI: Link-Based Ranking & PageRank Algorithm
Academic Syllabus: Unit V - Ranking: Link Based Ranking, Page Ranking Algorithm

Implements:
1. Web Graph Construction (Directed Adjacency Matrix)
2. Transition Probability Matrix M with Dangling Node Handling
3. Power Iteration Algorithm with Damping Factor d = 0.85:
   PR(p_i) = (1 - d) / N + d * sum_{p_j in M(p_i)} (PR(p_j) / L(p_j))
4. Convergence Analysis over Iterations
"""

import numpy as np
from typing import Dict, List, Any


class PageRankEngine:
    """
    Computes PageRank authority distribution over the financial web graph.
    """

    def __init__(self, damping_factor: float = 0.85, max_iterations: int = 50, tolerance: float = 1e-6):
        self.damping_factor = damping_factor
        self.max_iterations = max_iterations
        self.tolerance = tolerance

    def compute_pagerank(self, link_graph: Dict[str, List[str]] = None) -> Dict[str, Any]:
        """
        :param link_graph: Adjacency map: {url: [outlink_1, outlink_2, ...]}
        """
        if not link_graph:
            link_graph = {
                "https://finance.vault.internal/fed-rates": [
                    "https://finance.vault.internal/treasury-yields",
                    "https://finance.vault.internal/market-outlook"
                ],
                "https://finance.vault.internal/treasury-yields": [
                    "https://finance.vault.internal/fed-rates",
                    "https://finance.vault.internal/etf-flows"
                ],
                "https://finance.vault.internal/market-outlook": [
                    "https://finance.vault.internal/fed-rates",
                    "https://finance.vault.internal/etf-flows"
                ],
                "https://finance.vault.internal/etf-flows": [
                    "https://finance.vault.internal/fed-rates"
                ]
            }

        nodes = sorted(list(link_graph.keys()))
        N = len(nodes)
        node_to_idx = {url: i for i, url in enumerate(nodes)}

        # Build stochastic transition matrix M
        # M[j, i] = probability of moving from i to j = 1 / L(i)
        M = np.zeros((N, N), dtype=np.float64)

        for src, targets in link_graph.items():
            src_idx = node_to_idx[src]
            valid_targets = [t for t in targets if t in node_to_idx]

            if valid_targets:
                prob = 1.0 / len(valid_targets)
                for t in valid_targets:
                    dest_idx = node_to_idx[t]
                    M[dest_idx, src_idx] = prob
            else:
                # Dangling node: uniform random jump to all nodes
                M[:, src_idx] = 1.0 / N

        # Uniform initial probability distribution
        p = np.full(N, 1.0 / N, dtype=np.float64)
        teleport = np.full(N, (1.0 - self.damping_factor) / N, dtype=np.float64)

        iteration_history = []

        # Power Iteration
        for it in range(self.max_iterations):
            p_next = teleport + self.damping_factor * np.dot(M, p)

            delta = np.linalg.norm(p_next - p, 1)
            iteration_history.append({"iteration": it + 1, "delta": float(delta)})

            p = p_next
            if delta < self.tolerance:
                break

        # Format ranked results
        ranked_pages = []
        for i in np.argsort(-p):
            ranked_pages.append({
                "rank": len(ranked_pages) + 1,
                "url": nodes[i],
                "pagerank_score": round(float(p[i]), 6),
                "authority_percentage": round(float(p[i] * 100), 2)
            })

        return {
            "algorithm": "PageRank Power Iteration",
            "damping_factor": self.damping_factor,
            "total_nodes": N,
            "converged_iterations": len(iteration_history),
            "ranked_pages": ranked_pages,
            "convergence_trace": iteration_history[:6]
        }
