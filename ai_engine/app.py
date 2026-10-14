"""
BioVault-AI: Master AI, Vision, Deep Learning & Information Retrieval Microservice
Exposes RESTful endpoints for all academic syllabus modules.
"""

import base64
import cv2
import numpy as np
from fastapi import FastAPI, Query, Body, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

try:
    import insightface
    from insightface.app import FaceAnalysis
except ImportError:
    insightface = None
    FaceAnalysis = None

# Import DL and Vision modules
from rnn_models import ComputationalGraphUnfolder, BidirectionalRNN, GradientVanishingExplodingAnalyzer
from lstm_liveness import TemporalLivenessClassifier
from autoencoder_models import DeepAutoencoder, DenoisingAutoencoder, VariationalAutoencoder, ImageCompressionAutoencoder
from autoencoder_anomaly import TrafficAnomalyDetector
from gmm_spending import GaussianMixtureSpendingModel
from vision_pipeline import BiometricVisionPipeline
from case_studies.self_driving_study import DriverVigilanceSystem, AutonomousTrajectoryForecaster
from case_studies.image_captioning import ImageCaptioningPipeline

# Import IR & Web Intelligence modules
from crawler import FinancialWebCrawler
from pagerank import PageRankEngine
from mapreduce_indexer import MapReduceIndexer
from parallel_ir import ParallelQueryProcessor
from language_model_ir import StatisticalLanguageModelIR, FiniteAutomataLM
from ranking_eval import RankingEvaluator
from recommender import HybridFinancialRecommender
from information_extraction import FinancialInformationExtractor
from semantic_web import SemanticKnowledgeGraph
from rag_chatbot import BankingAIChatbot

app = FastAPI(
    title="BioVault-AI Intelligence Engine",
    description="Multi-Modal Biometrics, Deep Learning, Vision & Information Retrieval Microservice",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instantiate core engines
graph_unfolder = ComputationalGraphUnfolder()
bi_rnn = BidirectionalRNN()
liveness_classifier = TemporalLivenessClassifier()
denoiser = DenoisingAutoencoder()
vae = VariationalAutoencoder()
compressor = ImageCompressionAutoencoder()
anomaly_detector = TrafficAnomalyDetector()
gmm_model = GaussianMixtureSpendingModel()
driver_monitor = DriverVigilanceSystem()
trajectory_forecaster = AutonomousTrajectoryForecaster()
captioner = ImageCaptioningPipeline()

crawler = FinancialWebCrawler()
pagerank_engine = PageRankEngine()
mr_indexer = MapReduceIndexer()
parallel_processor = ParallelQueryProcessor()
lm_ir = StatisticalLanguageModelIR()
evaluator = RankingEvaluator()
recommender = HybridFinancialRecommender()
ner_extractor = FinancialInformationExtractor()
semantic_kg = SemanticKnowledgeGraph()
banking_chatbot = BankingAIChatbot()

# Preload sample crawled documents into Language Model index
initial_crawl = crawler.simulate_crawl()
lm_ir.fit_corpus(initial_crawl["crawled_documents"])
mr_indexer.build_index_from_documents(initial_crawl["crawled_documents"])


# ==========================================
# 1. RNN, LSTM & SEQUENCE LEARNING ENDPOINTS
# ==========================================

@app.post("/api/ml/rnn/unfold")
def unfold_graph(payload: Optional[Any] = Body(None)):
    """Unfolds the computational graph across T discrete time slices."""
    sequence = None
    if isinstance(payload, list):
        sequence = payload
    elif isinstance(payload, dict):
        sequence = payload.get("sequence")

    if not sequence:
        # Default 10-step sequence with 6 features
        import numpy as np
        sequence = np.random.randn(10, 6).tolist()
    import numpy as np
    return graph_unfolder.unfold_forward(np.array(sequence))


@app.get("/api/ml/rnn/gradient-analysis")
def gradient_analysis(length: int = 25, spectral_radius: float = 0.85):
    """Demonstrates vanishing and exploding gradient phenomena across time horizons."""
    return GradientVanishingExplodingAnalyzer.simulate_gradient_flow(length, spectral_radius)


@app.post("/api/ml/liveness-lstm")
def evaluate_liveness(payload: Dict[str, Any] = Body(...)):
    """
    Ingests 20-frame Eye Aspect Ratio (EAR) sequence through LSTM/GRU selective gates.
    """
    sequence = payload.get("sequence", [])
    model_type = payload.get("model_type", "lstm")

    if not sequence:
        # Default realistic blink sequence: open (0.32) -> closing (0.24) -> closed (0.16) -> open (0.33)
        import numpy as np
        t = np.linspace(0, 1, 20)
        ear_curve = 0.32 - 0.16 * np.exp(-((t - 0.5) ** 2) / 0.02)
        sequence = [[float(ear), float(ear), 0.0, 0.0, 0.1, 0.0] for ear in ear_curve]

    return liveness_classifier.evaluate_sequence(sequence, model_type=model_type)


# ==========================================
# 2. AUTOENCODERS & ANOMALY DETECTION
# ==========================================

@app.post("/api/ml/autoencoder/denoise")
def denoise_sample(payload: Optional[Any] = Body(None)):
    """Restores clean signal from noise using Denoising Autoencoder."""
    clean_vector = None
    if isinstance(payload, list):
        clean_vector = payload
    elif isinstance(payload, dict):
        clean_vector = payload.get("clean_vector") or payload.get("vector")
    if not clean_vector:
        clean_vector = [0.2, 0.5, 0.8, 0.1, 0.9, 0.4, 0.3, 0.7, 0.6, 0.2, 0.1, 0.8, 0.5, 0.4, 0.9, 0.3]
    return denoiser.denoise(clean_vector)


@app.post("/api/ml/autoencoder/vae")
def vae_sample(payload: Optional[Any] = Body(None)):
    """Passes vector through VAE with reparameterization trick (mu + sigma * eps)."""
    vector = None
    if isinstance(payload, list):
        vector = payload
    elif isinstance(payload, dict):
        vector = payload.get("vector")
    if not vector:
        vector = [0.5] * 16
    import numpy as np
    return vae.forward(np.array(vector))


@app.post("/api/ml/autoencoder/compress")
def compress_features(payload: Optional[Any] = Body(None)):
    """Compresses 128-D biometric vector into 16 quantized bytes."""
    vector = None
    if isinstance(payload, list):
        vector = payload
    elif isinstance(payload, dict):
        vector = payload.get("vector")
    if not vector:
        import numpy as np
        vector = np.random.randn(128).tolist()
    return compressor.compress(vector)


@app.post("/api/ml/anomaly-detect")
def detect_traffic_anomaly(features: Dict[str, float] = Body(...)):
    """
    Case study: Autoencoders for Anomaly Detection in Network / Financial Traffic.
    Calculates reconstruction error ||x - x_hat||^2 > tau.
    """
    return anomaly_detector.evaluate_traffic_packet(features)


@app.get("/api/ml/gmm-clusters")
def evaluate_gmm_spending(amount: float = Query(75.0)):
    """Evaluates multimodal spending behavior via Gaussian Mixture Model (EM)."""
    return gmm_model.evaluate_transaction(amount)


# ==========================================
# 3. CASE STUDIES & VISION PIPELINE
# ==========================================

@app.post("/api/ml/case-study/self-driving")
def self_driving_case_study(payload: Dict[str, Any] = Body(...)):
    """Case study: Self-driving vehicle driver vigilance & trajectory forecasting."""
    ear_seq = payload.get("ear_sequence", [0.3, 0.3, 0.29, 0.18, 0.16, 0.19, 0.31, 0.32])
    head_pitch = payload.get("head_pitch", -5.0)
    waypoints = payload.get("waypoints", [])

    vigilance = driver_monitor.evaluate_driver_state(ear_seq, head_pitch)
    trajectory = trajectory_forecaster.forecast_path(waypoints)

    return {
        "case_study": "Self-Driving Vehicles: Cabin Perception & Trajectory RNN",
        "driver_vigilance": vigilance,
        "autonomous_trajectory": trajectory
    }


@app.post("/api/ml/case-study/image-caption")
def image_caption_case_study(features: Optional[List[float]] = Body(None)):
    """Case study: Automatic Image Captioning using CNN + LSTM decoder."""
    return captioner.generate_caption(features)


@app.post("/api/ml/vision/verify-embeddings")
def verify_embeddings(payload: Dict[str, Any] = Body(...)):
    """Verifies ResNet-34 128-D facial embeddings using Triplet Euclidean metric."""
    emb_a = payload.get("embedding_a", [])
    emb_b = payload.get("embedding_b", [])
    return BiometricVisionPipeline.verify_embeddings(emb_a, emb_b)


# ==========================================
# 4. INFORMATION RETRIEVAL & WEB INTELLIGENCE
# ==========================================

@app.post("/api/ir/crawl")
def execute_crawl(seed_urls: Optional[List[str]] = Body(None)):
    """Harvests target pages with BeautifulSoup & Scrapy pipeline."""
    result = crawler.simulate_crawl(seed_urls)
    # Refresh downstream indices
    lm_ir.fit_corpus(result["crawled_documents"])
    mr_indexer.build_index_from_documents(result["crawled_documents"])
    return result


@app.get("/api/ir/pagerank")
def get_pagerank():
    """Computes PageRank authority distribution across crawled financial web graph."""
    return pagerank_engine.compute_pagerank(crawler.link_graph)


@app.get("/api/ir/mapreduce/index")
def get_inverted_index():
    """Returns inverted index generated via MapReduce architecture."""
    return {
        "architecture": "MapReduce Distributed Search Indexer",
        "total_terms": len(mr_indexer.inverted_index),
        "postings_sample": {k: mr_indexer.inverted_index[k] for k in list(mr_indexer.inverted_index.keys())[:8]}
    }


@app.get("/api/ir/parallel/search")
def parallel_search(q: str = Query("federal reserve interest rate")):
    """Executes multi-threaded parallel query processing across inverted index shards."""
    return parallel_processor.parallel_search(q, crawler.crawled_documents)


@app.get("/api/ir/search")
def language_model_search(q: str = Query("federal reserve inflation interest rate")):
    """
    Search using Multinomial Language Model with Dirichlet & JM smoothing,
    including sliding window passage retrieval.
    """
    return lm_ir.search_passages(q)


@app.get("/api/ir/eval")
def get_ranking_eval():
    """Evaluates retrieval performance using BM25, MAP, and NDCG."""
    return evaluator.benchmark_system()


@app.post("/api/ir/recommendations")
def get_recommendations(profile: Dict[str, Any] = Body(...)):
    """Generates hybrid investment recommendations (CF + Content-Based + Knowledge)."""
    return recommender.recommend(profile)


@app.post("/api/ir/extract-entities")
def extract_entities(payload: Dict[str, str] = Body(...)):
    """Financial Named Entity Recognition (NER) extracting tickers, dates, figures."""
    text = payload.get("text", "The Federal Reserve raised the benchmark interest rate to 5.25% in Q3.")
    return ner_extractor.extract_entities(text)


@app.get("/api/ir/semantic-graph")
def get_semantic_graph(subject: Optional[str] = None):
    """Returns RDF Triples (Subject, Predicate, Object) from the knowledge graph."""
    if subject:
        return {"matched_triples": semantic_kg.query_graph(subject_filter=subject)}
    return semantic_kg.get_full_graph()


@app.post("/api/ir/chatbot/query")
def chatbot_query(payload: Dict[str, Any] = Body(...)):
    """
    RAG & IR Chatbot answering queries based on CUSTOMER_MANUAL.txt.
    Supports Okapi BM25, TF-IDF dense semantic, and hybrid retrieval.
    """
    query_text = payload.get("query", "").strip()
    mode = payload.get("retrieval_mode", payload.get("mode", "hybrid"))
    top_k = int(payload.get("top_k", 4))
    history = payload.get("history", [])
    return banking_chatbot.query(user_query=query_text, retrieval_mode=mode, top_k=top_k, history=history)


@app.get("/api/ir/chatbot/status")
def chatbot_status():
    """Returns knowledge base indexing status and passage statistics."""
    return banking_chatbot.get_status()


@app.post("/api/ir/chatbot/reload")
def chatbot_reload():
    """Reloads the customer manual and updates the index."""
    stats = banking_chatbot.load_knowledge_base()
    return {"message": "Knowledge base reloaded successfully", "stats": stats}


@app.get("/")
def root():
    return {
        "service": "BioVault-AI Deep Learning & Information Retrieval Platform",
        "status": "ONLINE",
        "modules_active": [
            "Sequence Learning, RNNs, LSTMs, GRUs, Computational Graphs",
            "Autoencoders (CAE, VAE, DAE, Deep AE Anomaly Detection)",
            "Computer Vision (SSD MobileNet V1, 68 Landmarks, ResNet-34)",
            "Language Models for IR (Multinomial, Dirichlet, JM, DFR, Passage Retrieval)",
            "Web Crawling (BS4/Scrapy), MapReduce, PageRank, Parallel IR, BM25 / MAP / NDCG",
            "Recommender Systems (CF, CB, KB), NER, Semantic Web RDF Triples",
            "Autonomous Perception & Captioning Case Studies"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
