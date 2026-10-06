const axios = require('axios');
const store = require('../models/store');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

exports.createTransaction = async (req, res) => {
  try {
    const {
      amount,
      merchant = 'External Clearing Transfer',
      hour = new Date().getHours(),
      velocity = 1.0,
      geo_distance = 10.0
    } = req.body;

    const userId = req.user?.sub || 'usr_biovault_01';

    // Call Python AI Microservice Autoencoder Anomaly Detection Endpoint
    let anomalyResult = {
      is_anomalous: false,
      reconstruction_error: 0.05,
      anomaly_score: 0.12,
      recommended_action: 'Allow Transaction'
    };

    try {
      const aiResponse = await axios.post(`${AI_ENGINE_URL}/api/ml/anomaly-detect`, {
        amount: Number(amount),
        hour: Number(hour),
        velocity: Number(velocity),
        geo_distance: Number(geo_distance)
      }, { timeout: 3000 });
      anomalyResult = aiResponse.data;
    } catch (e) {
      // Fallback local heuristic if AI microservice is not yet started
      const isHigh = Number(amount) > 5000 || Number(velocity) > 8;
      anomalyResult = {
        is_anomalous: isHigh,
        reconstruction_error: isHigh ? 0.72 : 0.08,
        anomaly_score: isHigh ? 0.85 : 0.15,
        recommended_action: isHigh ? 'Step-Up Biometric Authentication Required' : 'Allow Transaction'
      };
    }

    const txRecord = store.addTransaction({
      userId,
      amount: Number(amount),
      merchant,
      hour,
      reconstructionError: anomalyResult.reconstruction_error,
      anomalyScore: anomalyResult.anomaly_score,
      isAnomalous: anomalyResult.is_anomalous,
      status: anomalyResult.is_anomalous ? 'FLAGGED FOR BIOMETRIC VERIFICATION' : 'SETTLED & CLEARED'
    });

    return res.json({
      transaction: txRecord,
      anomalyEvaluation: anomalyResult
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getTransactions = (req, res) => {
  const userId = req.user?.sub || 'usr_biovault_01';
  return res.json({ transactions: store.getTransactions(userId) });
};
