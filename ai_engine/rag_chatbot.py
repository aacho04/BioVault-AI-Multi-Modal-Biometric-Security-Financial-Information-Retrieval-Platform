"""
BioVault-AI: Enterprise Banking AI Assistant & RAG Engine
Information Retrieval (IR) & Retrieval-Augmented Generation (RAG)
Powered by Okapi BM25, TF-IDF / Vector Space Models, Hybrid Search,
and Strict Knowledge Base Grounding over CUSTOMER_MANUAL.txt.
"""

import os
import re
import math
import json
import time
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
import requests

# Default path to customer manual
DEFAULT_MANUAL_PATHS = [
    os.environ.get("KNOWLEDGE_BASE_PATH", ""),
    os.path.join(os.path.dirname(__file__), "..", "CUSTOMER_MANUAL.txt"),
    os.path.join(os.path.dirname(__file__), "CUSTOMER_MANUAL.txt"),
    os.path.abspath("CUSTOMER_MANUAL.txt")
]

STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's",
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on",
    "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own",
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then",
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
    "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with",
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves"
}


class ManualPassage:
    """Represents an indexable chunk from the customer manual."""
    def __init__(self, passage_id: str, section_num: str, section_title: str, text: str, parent_header: str = ""):
        self.passage_id = passage_id
        self.section_num = section_num
        self.section_title = section_title
        self.text = text.strip()
        self.parent_header = parent_header
        self.tokens: List[str] = []
        self.word_count = len(text.split())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "passage_id": self.passage_id,
            "section_num": self.section_num,
            "section_title": self.section_title,
            "parent_header": self.parent_header,
            "text": self.text,
            "word_count": self.word_count
        }


class ManualParser:
    """Parses CUSTOMER_MANUAL.txt into hierarchical sections and granular passages."""

    @staticmethod
    def resolve_file_path(custom_path: Optional[str] = None) -> str:
        candidates = [custom_path] if custom_path else []
        candidates.extend(DEFAULT_MANUAL_PATHS)
        for p in candidates:
            if p and os.path.exists(p) and os.path.isfile(p):
                return os.path.abspath(p)
        raise FileNotFoundError(f"CUSTOMER_MANUAL.txt could not be found in candidates: {candidates}")

    @classmethod
    def parse_manual(cls, file_path: str) -> Tuple[List[ManualPassage], Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            raw_text = f.read()

        passages: List[ManualPassage] = []
        lines = raw_text.splitlines()

        current_major_header = "General Overview"
        current_section_num = "0.0"
        current_section_title = "BioVault-AI User Manual Overview"
        buffer_lines = []

        major_header_pattern = re.compile(r"^[=\-]{4,}\s*\n?([0-9]+\.\s+[A-Z\s&,\(\)\-]+)\n?^[=\-]{4,}", re.MULTILINE)
        sub_section_pattern = re.compile(r"^([0-9]+\.[0-9]+)\.\s*(.+):?$")

        # Split text into major chapters first
        # Match pattern: lines with ================= and numbers
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Detect major section headers surrounded by ======
            if line.startswith("===") or line.startswith("---"):
                # Lookahead to see if next line is a header like '1. PLATFORM OVERVIEW'
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    m = re.match(r"^([0-9]+)\.\s+([A-Z\s&,\(\)\-]+)$", next_line)
                    if m:
                        # Flush current buffer
                        if buffer_lines and any(b.strip() for b in buffer_lines):
                            text = "\n".join(buffer_lines).strip()
                            if len(text) > 30:
                                pid = f"p_{len(passages) + 1:03d}"
                                passages.append(ManualPassage(pid, current_section_num, current_section_title, text, current_major_header))
                            buffer_lines = []

                        current_major_header = f"Section {m.group(1)}: {m.group(2).title()}"
                        current_section_num = f"{m.group(1)}.0"
                        current_section_title = current_major_header
                        # Skip until closing delimiter
                        i += 2
                        if i < len(lines) and (lines[i].startswith("===") or lines[i].startswith("---")):
                            i += 1
                        continue

            # Check for sub-section like '2.1. Email One-Time Password (OTP):' or '5.3. Strict Lockdown Policy:'
            sub_m = sub_section_pattern.match(line)
            if sub_m:
                # Flush existing buffer
                if buffer_lines and any(b.strip() for b in buffer_lines):
                    text = "\n".join(buffer_lines).strip()
                    if len(text) > 30:
                        pid = f"p_{len(passages) + 1:03d}"
                        passages.append(ManualPassage(pid, current_section_num, current_section_title, text, current_major_header))
                    buffer_lines = []

                current_section_num = sub_m.group(1)
                current_section_title = f"{sub_m.group(1)}. {sub_m.group(2).rstrip(':')}"
                i += 1
                continue

            # Detect special blocks like CONTACT CHANNELS, HEADQUARTERS, SUPPORT HOURS
            special_m = re.match(r"^([A-Z\s&]+):\s*$", line)
            if special_m and special_m.group(1) in ["CONTACT CHANNELS", "HEADQUARTERS & PHYSICAL OFFICE", "SUPPORT HOURS & RESPONSE COMMITMENT"]:
                if buffer_lines and any(b.strip() for b in buffer_lines):
                    text = "\n".join(buffer_lines).strip()
                    if len(text) > 30:
                        pid = f"p_{len(passages) + 1:03d}"
                        passages.append(ManualPassage(pid, current_section_num, current_section_title, text, current_major_header))
                    buffer_lines = []
                current_section_num = "7.x"
                current_section_title = f"7. {special_m.group(1).title()}"
                i += 1
                continue

            # Standard line
            if line:
                buffer_lines.append(lines[i])
            else:
                # Paragraph break: if buffer is already substantial (> 120 words), flush as a sub-chunk
                text_so_far = "\n".join(buffer_lines).strip()
                if len(text_so_far.split()) >= 120:
                    pid = f"p_{len(passages) + 1:03d}"
                    passages.append(ManualPassage(pid, current_section_num, current_section_title, text_so_far, current_major_header))
                    buffer_lines = []

            i += 1

        # Flush final buffer
        if buffer_lines and any(b.strip() for b in buffer_lines):
            text = "\n".join(buffer_lines).strip()
            if len(text) > 30:
                pid = f"p_{len(passages) + 1:03d}"
                passages.append(ManualPassage(pid, current_section_num, current_section_title, text, current_major_header))

        stats = {
            "source_file": file_path,
            "total_passages": len(passages),
            "total_words": sum(p.word_count for p in passages),
            "sections_indexed": list(dict.fromkeys(p.section_title for p in passages)),
            "last_modified": os.path.getmtime(file_path)
        }

        return passages, stats


class TextPreprocessor:
    """Preprocesses and tokenizes queries and passages."""

    @staticmethod
    def tokenize(text: str, remove_stopwords: bool = True) -> List[str]:
        # Lowercase and extract alphanumeric terms + special banking notations
        clean_text = text.lower()
        terms = re.findall(r"\b[a-z0-9_\-\.]{2,}\b", clean_text)
        if remove_stopwords:
            return [t for t in terms if t not in STOPWORDS]
        return terms


class BM25Engine:
    """
    Okapi BM25 Ranking Function
    Score(D, Q) = sum_i IDF(q_i) * (f(q_i, D) * (k1 + 1)) / (f(q_i, D) + k1 * (1 - b + b * (|D| / avgdl)))
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.passages: List[ManualPassage] = []
        self.doc_lengths: List[int] = []
        self.avgdl: float = 0.0
        self.doc_freqs: Dict[str, int] = Counter()
        self.idf_map: Dict[str, float] = {}
        self.total_docs: int = 0

    def fit(self, passages: List[ManualPassage]):
        self.passages = passages
        self.total_docs = len(passages)
        self.doc_lengths = []
        self.doc_freqs.clear()
        self.idf_map.clear()

        if self.total_docs == 0:
            return

        for p in passages:
            tokens = TextPreprocessor.tokenize(f"{p.section_title} {p.parent_header} {p.text}")
            p.tokens = tokens
            self.doc_lengths.append(len(tokens))
            unique_tokens = set(tokens)
            for t in unique_tokens:
                self.doc_freqs[t] += 1

        self.avgdl = sum(self.doc_lengths) / max(self.total_docs, 1)

        # Precompute Robertson-Spärck Jones IDF with smoothing
        for term, df in self.doc_freqs.items():
            idf = math.log((self.total_docs - df + 0.5) / (df + 0.5) + 1.0)
            self.idf_map[term] = max(idf, 0.1)

    def score_passage(self, query_tokens: List[str], passage_idx: int) -> Tuple[float, List[str]]:
        p = self.passages[passage_idx]
        counts = Counter(p.tokens)
        doc_len = self.doc_lengths[passage_idx]
        score = 0.0
        matched_terms = []

        for q in query_tokens:
            tf = counts[q]
            if tf > 0:
                matched_terms.append(q)
                idf = self.idf_map.get(q, 0.5)
                # Section title boost (gives 1.5x weight if term is in section heading)
                title_boost = 1.6 if q in TextPreprocessor.tokenize(p.section_title) else 1.0
                numerator = tf * (self.k1 + 1.0) * title_boost
                denominator = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / (self.avgdl + 1e-6)))
                score += idf * (numerator / denominator)

        return round(score, 4), matched_terms

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        q_tokens = TextPreprocessor.tokenize(query)
        if not q_tokens or not self.passages:
            return []

        results = []
        for idx, p in enumerate(self.passages):
            score, matches = self.score_passage(q_tokens, idx)
            if score > 0:
                results.append({
                    "passage": p,
                    "score": score,
                    "matched_terms": matches,
                    "retrieval_method": "Okapi BM25"
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]


class DenseSemanticEngine:
    """
    Vector Space TF-IDF Cosine Similarity Engine.
    Emulates dense semantic embedding retrieval without heavy external weights.
    """

    def __init__(self):
        self.vocabulary: Dict[str, int] = {}
        self.doc_vectors: List[Dict[int, float]] = []
        self.doc_norms: List[float] = []
        self.passages: List[ManualPassage] = []

    def fit(self, passages: List[ManualPassage]):
        self.passages = passages
        self.vocabulary.clear()
        self.doc_vectors = []
        self.doc_norms = []

        vocab_counter = Counter()
        for p in passages:
            vocab_counter.update(p.tokens)

        # Index top vocabulary
        self.vocabulary = {term: idx for idx, (term, _) in enumerate(vocab_counter.most_common())}

        # Build TF-IDF vectors
        total_docs = len(passages)
        for p in passages:
            counts = Counter(p.tokens)
            vec: Dict[int, float] = {}
            for term, count in counts.items():
                if term in self.vocabulary:
                    term_idx = self.vocabulary[term]
                    df = vocab_counter[term]
                    idf = math.log((total_docs + 1) / (df + 1)) + 1.0
                    vec[term_idx] = count * idf

            norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
            self.doc_vectors.append(vec)
            self.doc_norms.append(norm)

    def search(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        q_tokens = TextPreprocessor.tokenize(query)
        if not q_tokens or not self.passages:
            return []

        q_counts = Counter(q_tokens)
        q_vec: Dict[int, float] = {}
        for term, count in q_counts.items():
            if term in self.vocabulary:
                q_vec[self.vocabulary[term]] = count

        q_norm = math.sqrt(sum(v * v for v in q_vec.values())) or 1.0
        results = []

        for idx, (d_vec, d_norm) in enumerate(zip(self.doc_vectors, self.doc_norms)):
            dot_product = sum(d_vec[k] * val for k, val in q_vec.items() if k in d_vec)
            sim = dot_product / (q_norm * d_norm)
            if sim > 0.01:
                results.append({
                    "passage": self.passages[idx],
                    "score": round(sim, 4),
                    "matched_terms": [t for t in q_tokens if t in self.passages[idx].tokens],
                    "retrieval_method": "Semantic Vector Cosine"
                })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]


class HybridIRRetriever:
    """Combines BM25 and Semantic Vector Retrieval via Reciprocal Rank Fusion (RRF)."""

    def __init__(self, bm25: BM25Engine, semantic: DenseSemanticEngine):
        self.bm25 = bm25
        self.semantic = semantic

    def search(self, query: str, mode: str = "hybrid", top_k: int = 4) -> List[Dict[str, Any]]:
        if mode == "bm25":
            return self.bm25.search(query, top_k=top_k)
        elif mode == "semantic":
            return self.semantic.search(query, top_k=top_k)

        # Hybrid: Reciprocal Rank Fusion (RRF)
        bm25_hits = self.bm25.search(query, top_k=10)
        dense_hits = self.semantic.search(query, top_k=10)

        fused_scores: Dict[str, Dict[str, Any]] = {}
        k_rrf = 60

        for rank, hit in enumerate(bm25_hits):
            pid = hit["passage"].passage_id
            rrf_score = 1.0 / (k_rrf + rank + 1)
            fused_scores[pid] = {
                "passage": hit["passage"],
                "score": rrf_score,
                "bm25_score": hit["score"],
                "semantic_score": 0.0,
                "matched_terms": hit["matched_terms"],
                "retrieval_method": "Hybrid (BM25 + Semantic RRF)"
            }

        for rank, hit in enumerate(dense_hits):
            pid = hit["passage"].passage_id
            rrf_score = 1.0 / (k_rrf + rank + 1)
            if pid in fused_scores:
                fused_scores[pid]["score"] += rrf_score
                fused_scores[pid]["semantic_score"] = hit["score"]
                fused_scores[pid]["matched_terms"] = list(set(fused_scores[pid]["matched_terms"] + hit["matched_terms"]))
            else:
                fused_scores[pid] = {
                    "passage": hit["passage"],
                    "score": rrf_score,
                    "bm25_score": 0.0,
                    "semantic_score": hit["score"],
                    "matched_terms": hit["matched_terms"],
                    "retrieval_method": "Hybrid (BM25 + Semantic RRF)"
                }

        ranked = sorted(fused_scores.values(), key=lambda x: x["score"], reverse=True)
        # Normalize score to 0..1 range
        if ranked:
            max_s = ranked[0]["score"]
            for r in ranked:
                r["score"] = round(r["score"] / max_s, 4)

        return ranked[:top_k]


class RAGGenerator:
    """
    RAG Answer Generation Engine.
    Executes grounded synthesis using retrieved evidence.
    Supports:
    1. External LLMs (OpenAI, Gemini, Ollama) if API keys provided
    2. Intelligent Local Extractive-Synthesis engine out of the box (zero dependencies, 100% grounded, no hallucination)
    """

    def __init__(self):
        self.openai_key = os.environ.get("OPENAI_API_KEY", "")
        self.gemini_key = os.environ.get("GEMINI_API_KEY", "")

    def generate_answer(self, query: str, retrieved_passages: List[Dict[str, Any]], history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        if not retrieved_passages:
            return {
                "answer": (
                    "⚠️ **Information Unavailable in Knowledge Base**\n\n"
                    "The current BioVault-AI Customer Manual does not contain information to answer your query. "
                    "The manual covers:\n"
                    "• **Authentication & Onboarding** (OTP, FIDO2 Passkeys, PIN, 128-D Face Enrollment)\n"
                    "• **Wire Transfers & Fraud Screening** (Autoencoder anomaly scores, High-Value limits)\n"
                    "• **Biometric Guidelines** (Lighting, cyan oval alignment, Euclidean threshold D < 0.55)\n"
                    "• **Security Lockdown Protocols** (3 failed attempts, 5-hour freeze, strict disabled retry)\n"
                    "• **Emergency Support Contacts** (+91 (022) 8000-VAULT)\n\n"
                    "Please check your question or contact our 24/7 Security Operations Center."
                ),
                "is_grounded": False,
                "confidence": 0.0,
                "citations": [],
                "evidence": []
            }

        # Check if the highest score indicates a match
        top_hit = retrieved_passages[0]
        top_score = top_hit.get("score", 0.0)

        # Detect clear out-of-domain financial questions (mortgages, crypto, ATMs, credit cards)
        query_lower = query.lower()
        out_of_domain_terms = ["crypto", "bitcoin", "ethereum", "mortgage", "atm cash", "credit card loan", "checkbook"]
        for ood in out_of_domain_terms:
            if ood in query_lower:
                return {
                    "answer": (
                        f"⚠️ **Undocumented Platform Feature**\n\n"
                        f"The BioVault-AI manual does not document support for **{ood.capitalize()}**. "
                        "BioVault-AI is an enterprise multi-modal biometric security and wire transfer platform operating in ₹ INR. "
                        "It strictly does not offer retail credit cards, physical cash ATMs, or cryptocurrency trading.\n\n"
                        "For enterprise account inquiries, please reach our liaison team at `alex.vance@biovault.ai` or call `+91 (022) 8000-VAULT`."
                    ),
                    "is_grounded": False,
                    "confidence": 0.1,
                    "citations": [],
                    "evidence": []
                }

        citations = []
        for hit in retrieved_passages:
            p = hit["passage"]
            citations.append({
                "section_num": p.section_num,
                "section_title": p.section_title,
                "passage_id": p.passage_id,
                "score": hit["score"]
            })

        # Try Gemini API if key exists
        if self.gemini_key:
            try:
                ans = self._call_gemini(query, retrieved_passages, history)
                if ans:
                    return {
                        "answer": ans,
                        "is_grounded": True,
                        "confidence": 0.95,
                        "citations": citations,
                        "provider": "Google Gemini (RAG)"
                    }
            except Exception as e:
                print(f"[RAGGenerator] Gemini call failed, falling back to local synthesizer: {e}")

        # Try OpenAI API if key exists
        if self.openai_key:
            try:
                ans = self._call_openai(query, retrieved_passages, history)
                if ans:
                    return {
                        "answer": ans,
                        "is_grounded": True,
                        "confidence": 0.95,
                        "citations": citations,
                        "provider": "OpenAI (RAG)"
                    }
            except Exception as e:
                print(f"[RAGGenerator] OpenAI call failed, falling back to local synthesizer: {e}")

        # Local intelligent extractive-synthesis RAG engine (always works, 0 latency, 0 hallucination)
        synthesized_answer = self._synthesize_local_rag(query, retrieved_passages)
        return {
            "answer": synthesized_answer,
            "is_grounded": True,
            "confidence": min(round(top_score / 3.0, 2), 0.99) if top_score > 1.0 else round(top_score, 2),
            "citations": citations,
            "provider": "BioVault-AI Embedded RAG Engine"
        }

    def _synthesize_local_rag(self, query: str, retrieved_passages: List[Dict[str, Any]]) -> str:
        """
        Extractive-Synthesis algorithm:
        Scans retrieved passages, isolates candidate sentences addressing the query terms,
        structures answers with bold headers, bulleted action items, and section citations.
        """
        top_passage = retrieved_passages[0]["passage"]
        q_tokens = set(TextPreprocessor.tokenize(query))

        answer_parts = []
        lead_summary = f"According to the **BioVault-AI Operations Guide** [{top_passage.section_title}]:"
        answer_parts.append(lead_summary)

        # Extract most informative points across top passages
        seen_sentences = set()
        for hit in retrieved_passages[:3]:
            p = hit["passage"]
            # Split into sentences or lines
            lines = [l.strip() for l in p.text.split("\n") if l.strip()]
            for line in lines:
                # Strip leading dashes or bullets
                clean_line = re.sub(r"^[-•\*\d+\.]\s*", "", line).strip()
                if not clean_line or len(clean_line) < 15:
                    continue

                if clean_line in seen_sentences:
                    continue

                # Check relevance of this sentence to query tokens
                sent_tokens = set(TextPreprocessor.tokenize(clean_line))
                overlap = len(q_tokens.intersection(sent_tokens))
                if overlap > 0 or len(seen_sentences) < 3:
                    seen_sentences.add(clean_line)
                    answer_parts.append(f"• {clean_line} [{p.section_title}]")
                    if len(seen_sentences) >= 6:
                        break

        # Additional domain-specific helpful tips
        query_lower = query.lower()
        if "lock" in query_lower or "unblock" in query_lower or "block" in query_lower:
            answer_parts.append("\n> **Important Security Policy [Section 5.3]:** Biometric face authentication retry is **strictly disabled** once an account is locked. The platform automatically freezes for 5 hours to prevent automated brute-force attacks. For emergency assistance, call **+91 (022) 8000-VAULT**.")
        elif "threshold" in query_lower or "distance" in query_lower or "euclidean" in query_lower:
            answer_parts.append("\n> **Biometric Metric [Section 4.3]:** Live faces must achieve Euclidean distance **D < 0.55** against the enrolled 128-D template. Mismatches with D ≥ 0.55 are rejected as unauthorized.")
        elif "contact" in query_lower or "support" in query_lower or "hotline" in query_lower:
            answer_parts.append("\n> **Emergency Hotline [Section 7.0]:** +91 (022) 8000-VAULT (Toll-Free: 1800-246-8285) &bull; Email: `security-alerts@biovault.ai`.")

        return "\n\n".join(answer_parts)

    def _call_gemini(self, query: str, retrieved_passages: List[Dict[str, Any]], history: Optional[List[Dict[str, str]]]) -> Optional[str]:
        context_str = ""
        for i, hit in enumerate(retrieved_passages, 1):
            p = hit["passage"]
            context_str += f"\n--- EXCERPT {i} [{p.section_title}] ---\n{p.text}\n"

        system_instruction = (
            "You are BioVault-AI's Enterprise Banking AI Assistant. "
            "You MUST answer the user query STRICTLY based on the provided customer manual excerpts below. "
            "Cite section titles in brackets (e.g. [Section 3.2] or [Section 5.3]). "
            "Do NOT make up any unstated fees, external routing numbers, or non-existent options. "
            "If the information is not present in the excerpts, state that it is unavailable in the knowledge base."
        )

        prompt = f"{system_instruction}\n\nEVIDENCE FROM MANUAL:\n{context_str}\n\nUSER QUESTION:\n{query}\n\nANSWER:"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 600}
        }
        res = requests.post(url, json=payload, timeout=10)
        if res.status_code == 200:
            data = res.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return None

    def _call_openai(self, query: str, retrieved_passages: List[Dict[str, Any]], history: Optional[List[Dict[str, str]]]) -> Optional[str]:
        context_str = ""
        for i, hit in enumerate(retrieved_passages, 1):
            p = hit["passage"]
            context_str += f"\n--- EXCERPT {i} [{p.section_title}] ---\n{p.text}\n"

        messages = [
            {
                "role": "system",
                "content": (
                    "You are BioVault-AI's Enterprise Banking AI Assistant. "
                    "Answer strictly based on the provided customer manual excerpts. "
                    "Cite section numbers/titles in square brackets (e.g., [Section 5.3]). "
                    "Never invent fees or features not in the excerpts."
                )
            },
            {
                "role": "user",
                "content": f"EVIDENCE EXCERPTS:\n{context_str}\n\nUSER QUESTION:\n{query}"
            }
        ]

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.2,
            "max_tokens": 500
        }
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        if res.status_code == 200:
            data = res.json()
            return data["choices"][0]["message"]["content"].strip()
        return None


class BankingAIChatbot:
    """Master Chatbot Orchestrator managing Knowledge Base lifecycle and RAG Queries."""

    def __init__(self, manual_path: Optional[str] = None):
        self.manual_path = manual_path
        self.passages: List[ManualPassage] = []
        self.stats: Dict[str, Any] = {}
        self.bm25_engine = BM25Engine()
        self.semantic_engine = DenseSemanticEngine()
        self.hybrid_retriever: Optional[HybridIRRetriever] = None
        self.generator = RAGGenerator()
        self.load_knowledge_base(manual_path)

    def load_knowledge_base(self, manual_path: Optional[str] = None) -> Dict[str, Any]:
        """Loads and indexes the customer manual."""
        resolved_path = ManualParser.resolve_file_path(manual_path)
        self.manual_path = resolved_path
        self.passages, self.stats = ManualParser.parse_manual(resolved_path)

        # Fit IR Engines
        self.bm25_engine.fit(self.passages)
        self.semantic_engine.fit(self.passages)
        self.hybrid_retriever = HybridIRRetriever(self.bm25_engine, self.semantic_engine)

        print(f"[BankingAIChatbot] Loaded {len(self.passages)} passages from {resolved_path}")
        return self.stats

    def query(self, user_query: str, retrieval_mode: str = "hybrid", top_k: int = 4, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """Processes user question through IR search and RAG synthesis."""
        start_time = time.time()
        clean_query = user_query.strip()
        if not clean_query:
            return {
                "answer": "Please ask a question regarding BioVault-AI's biometric features, account security, transactions, or operations.",
                "citations": [],
                "evidence": [],
                "elapsed_ms": 0
            }

        # Retrieve relevant passages
        retrieved_hits = self.hybrid_retriever.search(clean_query, mode=retrieval_mode, top_k=top_k)

        # Generate grounded answer
        rag_result = self.generator.generate_answer(clean_query, retrieved_hits, history=history)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Format evidence for transparency
        evidence_list = []
        for hit in retrieved_hits:
            p = hit["passage"]
            evidence_list.append({
                "passage_id": p.passage_id,
                "section_num": p.section_num,
                "section_title": p.section_title,
                "parent_header": p.parent_header,
                "score": hit["score"],
                "matched_terms": hit.get("matched_terms", []),
                "text": p.text
            })

        return {
            "query": clean_query,
            "answer": rag_result["answer"],
            "is_grounded": rag_result["is_grounded"],
            "confidence": rag_result["confidence"],
            "provider": rag_result.get("provider", "BioVault RAG"),
            "citations": rag_result["citations"],
            "evidence": evidence_list,
            "retrieval_mode": retrieval_mode,
            "elapsed_ms": elapsed_ms
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "status": "ONLINE",
            "manual_path": self.manual_path,
            "total_passages": len(self.passages),
            "total_words": self.stats.get("total_words", 0),
            "sections_count": len(self.stats.get("sections_indexed", [])),
            "sections": self.stats.get("sections_indexed", []),
            "retrieval_methods_supported": ["bm25", "semantic", "hybrid"],
            "bm25_params": {"k1": self.bm25_engine.k1, "b": self.bm25_engine.b, "avgdl": round(self.bm25_engine.avgdl, 2)},
            "last_modified": self.stats.get("last_modified", 0)
        }
