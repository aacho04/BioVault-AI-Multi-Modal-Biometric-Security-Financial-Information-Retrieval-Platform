"""
BioVault-AI: MapReduce Inverted Indexing & Distributed Search Architecture
Academic Syllabus: Unit V - Map Reduce Web Retrieval: Search Engine Architectures, Cluster Based Architecture, Distributed Architectures

Implements:
1. Map Phase:
   - Input: (doc_id, raw_text)
   - Function: Tokenizes and emits (term, (doc_id, term_freq, positions))
2. Shuffle & Sort:
   - Groups intermediate key-value pairs by term
3. Reduce Phase:
   - Aggregates postings lists, calculates document frequencies (df_t), and forms the Inverted Index
4. Search Engine Architecture Emulation (Cluster Partitioning & Query Broker)
"""

import re
from typing import Dict, List, Tuple, Any
from collections import defaultdict


class MapReduceIndexer:
    """
    Demonstrates MapReduce parallel indexing architecture for distributed search engines.
    """

    def __init__(self):
        self.inverted_index: Dict[str, Dict[str, Any]] = {}
        self.doc_lengths: Dict[str, int] = {}
        self.total_docs: int = 0

    @staticmethod
    def map_function(doc_id: str, text: str) -> List[Tuple[str, Tuple[str, int]]]:
        """
        Map Phase: Emits (term, (doc_id, position)) for every word.
        """
        tokens = re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())
        intermediate_pairs = []
        for pos, token in enumerate(tokens):
            intermediate_pairs.append((token, (doc_id, pos)))
        return intermediate_pairs

    @staticmethod
    def shuffle_and_sort(intermediate_pairs: List[Tuple[str, Tuple[str, int]]]) -> Dict[str, List[Tuple[str, int]]]:
        """
        Shuffle & Sort Phase: Partitions keys across cluster reduce workers.
        """
        grouped = defaultdict(list)
        for term, payload in intermediate_pairs:
            grouped[term].append(payload)
        return dict(grouped)

    @staticmethod
    def reduce_function(term: str, postings_list: List[Tuple[str, int]]) -> Dict[str, Any]:
        """
        Reduce Phase: Merges occurrences into sorted document postings.
        """
        doc_map = defaultdict(lambda: {"tf": 0, "positions": []})
        for doc_id, pos in postings_list:
            doc_map[doc_id]["tf"] += 1
            doc_map[doc_id]["positions"].append(pos)

        postings = [{"doc_id": d, "tf": data["tf"], "positions": data["positions"]} for d, data in doc_map.items()]
        return {
            "df": len(postings),  # Document frequency
            "postings": postings
        }

    def build_index_from_documents(self, documents: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Executes end-to-end MapReduce inverted index construction over document corpus.
        """
        self.total_docs = len(documents)
        all_mapped = []

        # Map execution
        for doc in documents:
            doc_id = doc["doc_id"]
            text = doc["text"]
            self.doc_lengths[doc_id] = len(text.split())
            all_mapped.extend(self.map_function(doc_id, text))

        # Shuffle
        grouped = self.shuffle_and_sort(all_mapped)

        # Reduce
        self.inverted_index.clear()
        for term, postings in grouped.items():
            self.inverted_index[term] = self.reduce_function(term, postings)

        return {
            "map_reduce_job_status": "SUCCESS",
            "intermediate_map_pairs_emitted": len(all_mapped),
            "unique_terms_reduced": len(self.inverted_index),
            "total_documents": self.total_docs,
            "sample_index": {k: self.inverted_index[k] for k in list(self.inverted_index.keys())[:5]}
        }
