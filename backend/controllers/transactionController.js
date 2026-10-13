const axios = require('axios');
const store = require('../models/store');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

exports.getThreshold = (req, res) => {
  try {
    const { email } = req.query;
    const userId = req.user?.sub || 'usr_biovault_01';
    const targetKey = email || userId;
    const threshold = store.getThreshold(targetKey);
    return res.json({ success: true, threshold });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateThreshold = (req, res) => {
  try {
    const { email, newThreshold, faceVerified } = req.body;
    const userId = req.user?.sub || 'usr_biovault_01';
    const targetKey = email || userId;

    const lockStatus = store.isAccountLocked(targetKey);
    if (lockStatus.isLocked) {
      return res.status(423).json({
        success: false,
        error: `Account is currently FROZEN & LOCKED for 5 hours due to unauthorized access report. Unlocks in ${lockStatus.remainingHours} hours.`,
        lockStatus
      });
    }

    if (!faceVerified) {
      store.recordFailedAttempt(targetKey);
      return res.status(403).json({
        success: false,
        error: 'Biometric Face Authentication is strictly required to modify High-Value Transfer Limits.'
      });
    }

    const val = Number(newThreshold);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ error: 'Valid positive threshold amount in ₹ INR is required.' });
    }

    const currentThreshold = store.getThreshold(targetKey);
    if (val === currentThreshold) {
      return res.status(400).json({
        error: `New High-Value Limit cannot be the same as your current limit (₹${currentThreshold.toLocaleString('en-IN')}). Please choose a different amount.`
      });
    }

    const saved = store.setThreshold(targetKey, val);
    store.resetFailedAttempts(targetKey);
    return res.json({
      success: true,
      message: `High-Value Biometric Trigger Limit successfully updated to ₹${saved.toLocaleString('en-IN')}.`,
      threshold: saved
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const {
      amount,
      merchant = 'External Clearing Transfer',
      hour = new Date().getHours(),
      velocity = 1.0,
      geo_distance = 10.0,
      email,
      pin,
      faceVerified = false,
      customBigAmountThreshold
    } = req.body;

    const userId = req.user?.sub || 'usr_biovault_01';
    const userIdentifier = email || userId;

    const lockStatus = store.isAccountLocked(userIdentifier);
    if (lockStatus.isLocked) {
      return res.status(423).json({
        success: false,
        error: `Account is FROZEN & BLOCKED for 5 hours due to unauthorized access report. Automatic unblock in ${lockStatus.remainingHours} hours (at ${new Date(lockStatus.blockedUntil).toLocaleTimeString('en-IN')}).`,
        lockStatus
      });
    }

    const numAmount = Number(amount);
    
    // Get stored threshold and failed attempts count
    const storedThreshold = store.getThreshold(userIdentifier);
    const thresholdLimit = Number(customBigAmountThreshold) > 0 ? Number(customBigAmountThreshold) : storedThreshold;
    const failedAttempts = store.getFailedAttempts(userIdentifier);

    // Call Python AI Microservice Autoencoder Anomaly Detection Endpoint
    let anomalyResult = {
      is_anomalous: false,
      reconstruction_error: 0.05,
      anomaly_score: 0.12,
      recommended_action: 'Allow Transaction',
      failed_attempts: failedAttempts,
      contributing_risk_factors: []
    };

    try {
      const aiResponse = await axios.post(`${AI_ENGINE_URL}/api/ml/anomaly-detect`, {
        amount: numAmount,
        hour: Number(hour),
        velocity: Number(velocity),
        geo_distance: Number(geo_distance),
        failed_attempts: Number(failedAttempts)
      }, { timeout: 3000 });
      anomalyResult = aiResponse.data;
    } catch (e) {
      // Fallback local heuristic if AI microservice is not yet started
      const isHigh = numAmount >= thresholdLimit || Number(velocity) > 5 || failedAttempts >= 2;
      anomalyResult = {
        is_anomalous: isHigh,
        reconstruction_error: isHigh ? 0.72 : 0.08,
        anomaly_score: isHigh ? 0.85 : 0.15,
        failed_attempts: failedAttempts,
        contributing_risk_factors: [
          ...(numAmount >= thresholdLimit ? [`Unusual High-Value Surge (₹${numAmount.toFixed(2)} ≥ ₹${thresholdLimit})`] : []),
          ...(failedAttempts >= 1 ? [`${failedAttempts} Previous Failed Transfer Attempt(s) Detected`] : []),
          ...(Number(velocity) > 5 ? [`Velocity Spike (${velocity} tx/min)`] : [])
        ],
        recommended_action: isHigh ? 'Step-Up Biometric Authentication (PIN + Live Face Scan) Required' : 'Allow Transaction'
      };
    }

    const isBigAmount = numAmount >= thresholdLimit;
    const requiresFace = anomalyResult.is_anomalous || isBigAmount;

    // 1. Check PIN for all transactions
    if (!pin) {
      return res.status(200).json({
        requiresPin: true,
        isBigAmount,
        requiresFace,
        failedAttempts,
        anomalyEvaluation: anomalyResult,
        message: isBigAmount
          ? `High-Value Transfer (₹${numAmount.toFixed(2)} ≥ ₹${thresholdLimit}): Please enter Security PIN to initiate transfer.`
          : 'Please enter your Security PIN to confirm transfer.'
      });
    }

    const isPinValid = store.verifyPin(userIdentifier, pin);
    if (!isPinValid) {
      const updatedFailures = store.recordFailedAttempt(userIdentifier);
      if (updatedFailures >= 3) {
        const lockRecord = store.lockAccount(
          userIdentifier,
          5,
          'Account Blocked: 3 Consecutive Incorrect Security PIN Attempts'
        );
        return res.status(423).json({
          success: false,
          isLocked: true,
          failedAttempts: updatedFailures,
          lockStatus: lockRecord,
          error: `🛑 SECURITY LOCKDOWN: Failed authentication ${updatedFailures} times! Website is BLOCKED right away. Face authentication is strictly required to unblock.`
        });
      }
      return res.status(401).json({
        success: false,
        failedAttempts: updatedFailures,
        error: `Incorrect Security PIN. (${updatedFailures}/3 failed attempt(s)). Transaction unauthorized.`
      });
    }

    // 2. If it is a Big Amount (or AI Anomaly), require Face Biometric Authentication
    if (requiresFace && !faceVerified) {
      return res.status(200).json({
        requiresFaceAuth: true,
        isBigAmount,
        anomalyEvaluation: anomalyResult,
        thresholdLimit,
        failedAttempts,
        message: isBigAmount
          ? `High-Value Security Protocol: Transfer of ₹${numAmount.toFixed(2)} meets or exceeds your ₹${thresholdLimit.toFixed(2)} threshold. Live Biometric Face Authentication is required.`
          : `AI Risk Anomaly Detected (${anomalyResult.contributing_risk_factors?.join(' • ') || 'Elevated Risk'}): Live Biometric Face Authentication is required.`
      });
    }

    const txRecord = store.addTransaction({
      userId,
      amount: numAmount,
      merchant,
      hour,
      reconstructionError: anomalyResult.reconstruction_error,
      anomalyScore: anomalyResult.anomaly_score,
      isAnomalous: anomalyResult.is_anomalous,
      status: requiresFace
        ? 'SETTLED & CLEARED (Multi-Factor: PIN + Biometric Face Scan)'
        : 'SETTLED & CLEARED (Authorized via Security PIN)'
    });

    // Reset failed attempts upon successful authorized clearance
    store.resetFailedAttempts(userIdentifier);

    return res.json({
      success: true,
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
