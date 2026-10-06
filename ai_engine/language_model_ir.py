"""
BioVault-AI: Language Models for Information Retrieval & Passage Ranking
Academic Syllabus: Unit IV - Language Models for IR
Includes:
1. Finite Automata & Language Models (Generative word state transitions)
2. Types of Language Models (Unigram, Background Collection Model C)
3. Multinomial Distribution over Words: P(Q | theta_D) = prod P(q_i | theta_D)
4. Ranking with Language Models & Smoothing:
   - Jelinek-Mercer (JM) Interpolation: P_JM(q | theta_D) = (1 - lambda) * (c(q,D)/|D|) + lambda * P(q|C)
   - Bayesian Dirichlet Prior: P_Dir(q | theta_D) = (c(q,D) + mu * P(q|C)) / (|D| + mu)
5. Divergence from Randomness (DFR) scoring
6. Sliding Window Passage Retrieval & Ranking
"""

import math
import re
from typing import Dict, List, Tuple, Any
from collections import Counter


class FiniteAutomataLM:
    """
    Finite-State Automaton generating probabilistic token streams
    based on transitional word generation states.
    """

    def __init__(self):
        self.transitions = {
            "START": [("federal", 0.5), ("interest", 0.3), ("market", 0.2)],
            "federal": [("reserve", 0.8), ("funds", 0.2)],
            "reserve": [("interest", 0.6), ("inflation", 0.4)],
            "interest": [("rate", 0.9), ("yields", 0.1)],
            "rate": [("hike", 0.5), ("policy", 0.5)],
            "market": [("liquidity", 0.7), ("outlook", 0.3)]
        }

    def generate_probable_query(self, start_state: str = "START", steps: int = 4) -> List[str]:
        current = start_state
        tokens = []
        for _ in range(steps):
            choices = self.transitions.get(current, [])
            if not choices:
                break
            words, probs = zip(*choices)
            next_word = words[0]  # Deterministic top path
            tokens.append(next_word)
            current = next_word
        return tokens


class StatisticalLanguageModelIR:
    """
    Unigram Multinomial Language Model Search Engine featuring
    Jelinek-Mercer smoothing, Dirichlet prior smoothing, Divergence from Randomness,
    and sliding window passage retrieval.
    """

    def __init__(self, dirichlet_mu: float = 1500.0, jm_lambda: float = 0.35):
        self.dirichlet_mu = dirichlet_mu
        self.jm_lambda = jm_lambda
        self.collection_counts = Counter()
        self.total_collection_tokens = 0
        self.documents: List[Dict[str, Any]] = []

    def fit_corpus(self, documents: List[Dict[str, Any]]):
        """
        Builds the background collection language model P(w | C).
        """
        self.documents = documents
        self.collection_counts.clear()
        self.total_collection_tokens = 0

        for doc in documents:
            tokens = self.tokenize(doc["text"])
            self.collection_counts.update(tokens)
            self.total_collection_tokens += len(tokens)

    @staticmethod
    def tokenize(text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())

    def background_prob(self, word: str) -> float:
        """P(w | C) = c(w, C) / |C| with Laplace fallback."""
        count = self.collection_counts[word]
        if self.total_collection_tokens == 0:
            return 1e-6
        return max(count / self.total_collection_tokens, 1e-6)

    def score_document_dirichlet(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        """
        Bayesian Dirichlet Prior Smoothing Log-Likelihood:
        sum_i log( (c(q_i, D) + mu * P(q_i | C)) / (|D| + mu) )
        """
        doc_len = len(doc_tokens)
        counts = Counter(doc_tokens)
        log_score = 0.0

        for q in query_tokens:
            cq_d = counts[q]
            p_c = self.background_prob(q)
            prob_dir = (cq_d + self.dirichlet_mu * p_c) / (doc_len + self.dirichlet_mu)
            log_score += math.log(prob_dir)

        return log_score

    def score_document_jm(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        """
        Jelinek-Mercer Linear Interpolation:
        sum_i log( (1 - lambda) * (c(q_i, D) / |D|) + lambda * P(q_i | C) )
        """
        doc_len = max(len(doc_tokens), 1)
        counts = Counter(doc_tokens)
        log_score = 0.0

        for q in query_tokens:
            cq_d = counts[q]
            p_c = self.background_prob(q)
            prob_jm = (1.0 - self.jm_lambda) * (cq_d / doc_len) + (self.jm_lambda * p_c)
            log_score += math.log(max(prob_jm, 1e-9))

        return log_score

    def score_divergence_from_randomness(self, query_tokens: List[str], doc_tokens: List[str]) -> float:
        """
        Divergence from Randomness (DFR) scoring:
        Evaluates the informative deviation from a Poisson random term occurrence.
        """
        doc_len = max(len(doc_tokens), 1)
        counts = Counter(doc_tokens)
        avg_doc_len = (self.total_collection_tokens / max(len(self.documents), 1)) or 100.0
        dfr_score = 0.0

        for q in query_tokens:
            tf = counts[q]
            if tf > 0:
                lambda_term = self.collection_counts[q] / max(len(self.documents), 1)
                # Normalization by length
                tf_norm = tf * math.log2(1.0 + (avg_doc_len / doc_len))
                # Information content: -log2 P_poisson
                info = -math.log2(math.exp(-lambda_term) * (lambda_term ** tf_norm) / math.gamma(tf_norm + 1.0) + 1e-8)
                dfr_score += max(info, 0.0)

        return round(dfr_score, 4)

    def search_passages(self, query: str, passage_window_size: int = 40, stride: int = 20) -> Dict[str, Any]:
        """
        Passage Retrieval & Ranking:
        Splits documents into overlapping sliding passage windows of size L,
        scoring each sub-document segment to return exact candidate excerpts.
        """
        q_tokens = self.tokenize(query)
        scored_passages = []

        for doc in self.documents:
            words = doc["text"].split()
            # Slide passage window
            for start in range(0, len(words), stride):
                window_words = words[start: start + passage_window_size]
                if len(window_words) < 5:
                    continue

                passage_text = " ".join(window_words)
                p_tokens = self.tokenize(passage_text)

                dir_score = self.score_document_dirichlet(q_tokens, p_tokens)
                jm_score = self.score_document_jm(q_tokens, p_tokens)
                dfr_score = self.score_divergence_from_randomness(q_tokens, p_tokens)

                # Count query term matches
                match_count = sum(1 for q in q_tokens if q in p_tokens)
                if match_count > 0:
                    scored_passages.append({
                        "doc_id": doc["doc_id"],
                        "title": doc.get("title", "Financial Report"),
                        "passage_text": passage_text,
                        "passage_range": f"{start}-{start + len(window_words)}",
                        "dirichlet_score": round(dir_score, 4),
                        "jelinek_mercer_score": round(jm_score, 4),
                        "dfr_score": dfr_score,
                        "query_term_matches": match_count
                    })

        # Rank passages by Dirichlet Prior Log-Likelihood
        scored_passages.sort(key=lambda x: (x["query_term_matches"], x["dirichlet_score"]), reverse=True)

        return {
            "query": query,
            "query_tokens": q_tokens,
            "ranking_model": "Multinomial Language Model with Dirichlet & JM Smoothing",
            "total_passages_evaluated": len(scored_passages),
            "top_passages": scored_passages[:8]
        }
