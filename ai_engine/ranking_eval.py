"""
BioVault-AI: Ranking Functions & IR Evaluation Benchmark
Academic Syllabus: Unit V - Ranking: Simple Ranking Functions and Evaluations (BM25, TF-IDF, Precision@K, MAP, NDCG)

Implements:
1. Okapi BM25 Ranking Function:
   Score(D, Q) = sum_i IDF(q_i) * (f(q_i, D) * (k1 + 1)) / (f(q_i, D) + k1 * (1 - b + b * (|D| / avgdl)))
2. Standard Evaluation Metrics:
   - Precision@K
   - Recall@K
   - Mean Average Precision (MAP)
   - Normalized Discounted Cumulative Gain (NDCG@K)
"""

import math
from typing import Dict, List, Any
from collections import Counter


class RankingEvaluator:
    """
    Computes BM25 ranking scores and evaluates information retrieval systems
    against ground truth relevance judgments using MAP and NDCG.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def bm25_score(self, query_tokens: List[str], doc_tokens: List[str], doc_len: int, avgdl: float, idf_map: Dict[str, float]) -> float:
        counts = Counter(doc_tokens)
        score = 0.0
        for q in query_tokens:
            tf = counts[q]
            if tf > 0:
                idf = idf_map.get(q, 1.0)
                numerator = tf * (self.k1 + 1.0)
                denominator = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / (avgdl + 1e-6)))
                score += idf * (numerator / denominator)
        return round(score, 4)

    @staticmethod
    def precision_at_k(retrieved_doc_ids: List[str], relevant_doc_ids: List[str], k: int = 5) -> float:
        top_k = retrieved_doc_ids[:k]
        if not top_k:
            return 0.0
        hits = sum(1 for d in top_k if d in relevant_doc_ids)
        return round(hits / k, 4)

    @staticmethod
    def recall_at_k(retrieved_doc_ids: List[str], relevant_doc_ids: List[str], k: int = 5) -> float:
        if not relevant_doc_ids:
            return 0.0
        top_k = retrieved_doc_ids[:k]
        hits = sum(1 for d in top_k if d in relevant_doc_ids)
        return round(hits / len(relevant_doc_ids), 4)

    @staticmethod
    def mean_average_precision(retrieved_doc_ids: List[str], relevant_doc_ids: List[str]) -> float:
        hits = 0
        sum_precisions = 0.0
        for i, d in enumerate(retrieved_doc_ids):
            if d in relevant_doc_ids:
                hits += 1
                precision_at_i = hits / (i + 1)
                sum_precisions += precision_at_i
        return round(sum_precisions / max(len(relevant_doc_ids), 1), 4)

    @staticmethod
    def ndcg_at_k(retrieved_relevances: List[int], k: int = 5) -> float:
        """
        Calculates NDCG@K given graded relevance judgments (e.g., [3, 2, 0, 1]).
        """
        top_k = retrieved_relevances[:k]
        dcg = sum((rel / math.log2(idx + 2)) for idx, rel in enumerate(top_k))

        ideal = sorted(retrieved_relevances, reverse=True)[:k]
        idcg = sum((rel / math.log2(idx + 2)) for idx, rel in enumerate(ideal))

        if idcg == 0:
            return 0.0
        return round(dcg / idcg, 4)

    def benchmark_system(self) -> Dict[str, Any]:
        """
        Runs comprehensive evaluation comparison benchmark.
        """
        retrieved = ["doc_1", "doc_3", "doc_2", "doc_4", "doc_5"]
        ground_truth = ["doc_1", "doc_2"]
        graded_rels = [3, 1, 2, 0, 0]

        return {
            "retrieval_model": "Okapi BM25 Ranking vs. Language Model",
            "k1_parameter": self.k1,
            "b_parameter": self.b,
            "precision_at_3": self.precision_at_k(retrieved, ground_truth, 3),
            "precision_at_5": self.precision_at_k(retrieved, ground_truth, 5),
            "recall_at_5": self.recall_at_k(retrieved, ground_truth, 5),
            "mean_average_precision_map": self.mean_average_precision(retrieved, ground_truth),
            "ndcg_at_5": self.ndcg_at_k(graded_rels, 5)
        }
