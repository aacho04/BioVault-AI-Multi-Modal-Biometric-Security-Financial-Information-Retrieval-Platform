const express = require('express');
const axios = require('axios');
const router = express.Router();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// Generic forwarder helper
async function forwardRequest(method, endpoint, req, res) {
  try {
    const url = `${AI_ENGINE_URL}${endpoint}`;
    const config = {
      method,
      url,
      params: req.query,
      data: req.body,
      timeout: 5000
    };
    const response = await axios(config);
    return res.status(response.status).json(response.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return res.status(503).json({
      error: 'AI Engine Microservice unreachable or booting at port 8000.',
      detail: err.message
    });
  }
}

// Deep Learning & Vision
router.post('/ml/rnn/unfold', (req, res) => forwardRequest('post', '/api/ml/rnn/unfold', req, res));
router.get('/ml/rnn/gradient-analysis', (req, res) => forwardRequest('get', '/api/ml/rnn/gradient-analysis', req, res));
router.post('/ml/liveness-lstm', (req, res) => forwardRequest('post', '/api/ml/liveness-lstm', req, res));
router.post('/ml/autoencoder/denoise', (req, res) => forwardRequest('post', '/api/ml/autoencoder/denoise', req, res));
router.post('/ml/autoencoder/vae', (req, res) => forwardRequest('post', '/api/ml/autoencoder/vae', req, res));
router.post('/ml/autoencoder/compress', (req, res) => forwardRequest('post', '/api/ml/autoencoder/compress', req, res));
router.post('/ml/anomaly-detect', (req, res) => forwardRequest('post', '/api/ml/anomaly-detect', req, res));
router.get('/ml/gmm-clusters', (req, res) => forwardRequest('get', '/api/ml/gmm-clusters', req, res));
router.post('/ml/case-study/self-driving', (req, res) => forwardRequest('post', '/api/ml/case-study/self-driving', req, res));
router.post('/ml/case-study/image-caption', (req, res) => forwardRequest('post', '/api/ml/case-study/image-caption', req, res));
router.post('/ml/vision/verify-embeddings', (req, res) => forwardRequest('post', '/api/ml/vision/verify-embeddings', req, res));

// Information Retrieval & Web Intelligence
router.post('/ir/crawl', (req, res) => forwardRequest('post', '/api/ir/crawl', req, res));
router.get('/ir/pagerank', (req, res) => forwardRequest('get', '/api/ir/pagerank', req, res));
router.get('/ir/mapreduce/index', (req, res) => forwardRequest('get', '/api/ir/mapreduce/index', req, res));
router.get('/ir/parallel/search', (req, res) => forwardRequest('get', '/api/ir/parallel/search', req, res));
router.get('/ir/search', (req, res) => forwardRequest('get', '/api/ir/search', req, res));
router.get('/ir/eval', (req, res) => forwardRequest('get', '/api/ir/eval', req, res));
router.post('/ir/recommendations', (req, res) => forwardRequest('post', '/api/ir/recommendations', req, res));
router.post('/ir/extract-entities', (req, res) => forwardRequest('post', '/api/ir/extract-entities', req, res));
router.get('/ir/semantic-graph', (req, res) => forwardRequest('get', '/api/ir/semantic-graph', req, res));

module.exports = router;
