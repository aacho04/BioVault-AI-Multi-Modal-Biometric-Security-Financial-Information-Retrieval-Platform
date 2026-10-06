"""
BioVault-AI: Semantic Web & Knowledge Integration Module
Academic Syllabus: Unit VI - Semantic Web, Collecting and Integrating Specialized Information on the Web

Implements:
1. Resource Description Framework (RDF) Triple representation:
   (Subject, Predicate, Object) with ontology URIs
2. Knowledge Graph Store & Linked Data Integration
3. SPARQL-style graph query engine executing associative queries
"""

from typing import Dict, List, Tuple, Any


class RDFTriple:
    def __init__(self, subject: str, predicate: str, object_val: str):
        self.subject = subject
        self.predicate = predicate
        self.object_val = object_val

    def to_dict(self) -> Dict[str, str]:
        return {
            "subject": f"vault:{self.subject}",
            "predicate": f"schema:{self.predicate}",
            "object": f"vault:{self.object_val}"
        }


class SemanticKnowledgeGraph:
    """
    In-memory semantic knowledge graph storing financial and biometric RDF triples.
    """

    def __init__(self):
        self.triples: List[RDFTriple] = []
        self._initialize_core_ontology()

    def _initialize_core_ontology(self):
        core_facts = [
            ("FederalReserve", "setsInterestRate", "Benchmark_5.25_Percent"),
            ("Benchmark_5.25_Percent", "influencesYieldOf", "US_Treasury_10Yr"),
            ("US_Treasury_10Yr", "classifiedAs", "FixedIncomeSecurity"),
            ("FixedIncomeSecurity", "hasRiskLevel", "Low_Risk"),
            ("CleanEnergyFund", "hasESGCompliance", "Article8_Regulated"),
            ("BioVaultUser_01", "hasBiometricTrustTier", "Tier_4_HardwareFIDO2"),
            ("Tier_4_HardwareFIDO2", "grantsMaxTransactionLimit", "USD_250000"),
            ("S&P500_ETF", "classifiedAs", "BroadMarketEquity"),
            ("S&P500_ETF", "hasHistoricalAnnualReturn", "10.2_Percent")
        ]
        for s, p, o in core_facts:
            self.triples.append(RDFTriple(s, p, o))

    def add_triple(self, subject: str, predicate: str, object_val: str):
        self.triples.append(RDFTriple(subject, predicate, object_val))

    def query_graph(self, subject_filter: str = None, predicate_filter: str = None) -> List[Dict[str, str]]:
        """
        Executes SPARQL-like pattern matching over knowledge triples.
        """
        matched = []
        for t in self.triples:
            if subject_filter and subject_filter.lower() not in t.subject.lower():
                continue
            if predicate_filter and predicate_filter.lower() not in t.predicate.lower():
                continue
            matched.append(t.to_dict())
        return matched

    def get_full_graph(self) -> Dict[str, Any]:
        return {
            "format": "W3C RDF / Linked Open Data standard",
            "total_triples": len(self.triples),
            "triples": [t.to_dict() for t in self.triples],
            "vocabulary_namespaces": {
                "vault": "https://biovault.ai/ontology/",
                "schema": "http://schema.org/",
                "fibo": "https://spec.edmcouncil.org/fibo/"
            }
        }
