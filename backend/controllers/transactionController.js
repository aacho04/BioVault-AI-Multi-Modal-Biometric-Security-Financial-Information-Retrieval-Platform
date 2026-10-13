const axios = require('axios');
const store = require('../models/store');
const { MongoTransaction, calculateHaversineDistanceKm } = require('../models/mongoModels');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

exports.detectCurrentLocation = async (req, res) => {
  try {
    const resp = await axios.get('https://ipapi.co/json/', { timeout: 3500 });
    if (resp.data && resp.data.city) {
      return res.json({
        city: `${resp.data.city}, ${resp.data.region}, India`,
        latitude: resp.data.latitude || 18.5196,
        longitude: resp.data.longitude || 73.8545,
        ip: resp.data.ip,
        geoDistanceKm: 0.0,
        source: 'Live Network IP Geolocation'
      });
    }
  } catch (e) {
    // Graceful fallback
  }
  return res.json({
    city: 'Pune, Maharashtra, India',
    latitude: 18.5196,
    longitude: 73.8545,
    geoDistanceKm: 0.0,
    source: 'Pune Geo-Centroid'
  });
};

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
      geo_distance,
      location,
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
    
    // Resolve location and real distance from home baseline (Pune centroid: 18.5196, 73.8545)
    const HOME_LAT = 18.5196;
    const HOME_LON = 73.8545;
    let resolvedDistance = typeof geo_distance === 'number' ? Number(geo_distance) : 0.0;
    const locationObj = {
      latitude: location?.latitude || HOME_LAT,
      longitude: location?.longitude || HOME_LON,
      city: location?.city || 'Pune, Maharashtra, India',
      geoDistanceKm: resolvedDistance,
      ip: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      source: location?.source || 'Browser Geolocation API'
    };

    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      const calcDist = calculateHaversineDistanceKm(
        HOME_LAT, HOME_LON,
        location.latitude, location.longitude
      );
      // Within local metropolitan area (< 60 km), distance is considered local (0.0 km)
      resolvedDistance = calcDist <= 60.0 ? 0.0 : calcDist;
      locationObj.geoDistanceKm = resolvedDistance;
    }

    // Get stored threshold and failed attempts count
    const storedThreshold = store.getThreshold(userIdentifier);
    const thresholdLimit = Number(customBigAmountThreshold) > 0 ? Number(customBigAmountThreshold) : storedThreshold;
    const failedAttempts = store.getFailedAttempts(userIdentifier);

    // Multi-Signal History & Burst Signals
    const recentWindowCount = store.getRecentTransactionsCount(userIdentifier, 5);
    const customerHistory = store.getCustomerHistoryStats(userIdentifier);

    // Call Python AI Microservice Transaction Risk Intelligence Engine
    let anomalyResult = {
      risk_score: 5,
      risk_level: 'LOW',
      decision: 'ALLOW_WITH_PIN',
      requires_face_auth: false,
      is_anomalous: false,
      reconstruction_error: 0.05,
      anomaly_score: 0.05,
      recommended_action: 'Allow via Security PIN Verification',
      failed_attempts: failedAttempts,
      recent_interval_tx_count: recentWindowCount,
      contributing_risk_factors: [],
      signals: {}
    };

    try {
      const aiResponse = await axios.post(`${AI_ENGINE_URL}/api/ml/anomaly-detect`, {
        amount: numAmount,
        customer_history_mean: customerHistory.mean,
        customer_history_std: customerHistory.std,
        recent_interval_tx_count: recentWindowCount,
        hour: Number(hour),
        velocity: Number(velocity),
        geo_distance: Number(resolvedDistance),
        failed_attempts: Number(failedAttempts)
      }, { timeout: 3500 });
      anomalyResult = aiResponse.data;
    } catch (e) {
      // Fallback local rules engine if AI microservice is briefly busy
      const isHighAmount = numAmount >= thresholdLimit;
      const isBurst = recentWindowCount >= 3 || Number(velocity) > 5;
      const isAuthRisk = failedAttempts >= 2;
      const isGeoRisk = resolvedDistance > 80.0;
      const fallbackRisk = Math.min(100, (isHighAmount ? 40 : 5) + (isBurst ? 35 : 0) + (isAuthRisk ? 25 : 0) + (isGeoRisk ? 20 : 0));
      const requiresStepUp = fallbackRisk >= 36;

      anomalyResult = {
        risk_score: fallbackRisk,
        risk_level: fallbackRisk >= 66 ? 'HIGH' : (fallbackRisk >= 36 ? 'MEDIUM' : 'LOW'),
        decision: requiresStepUp ? 'STEP_UP_BIOMETRIC_AUTH' : 'ALLOW_WITH_PIN',
        requires_face_auth: requiresStepUp,
        is_anomalous: requiresStepUp,
        reconstruction_error: requiresStepUp ? 0.72 : 0.08,
        anomaly_score: roundTo(fallbackRisk / 100, 4),
        failed_attempts: failedAttempts,
        recent_interval_tx_count: recentWindowCount,
        contributing_risk_factors: [
          ...(isHighAmount ? [`Unusual High-Value Surge (₹${numAmount.toFixed(2)} ≥ ₹${thresholdLimit})`] : []),
          ...(isBurst ? [`Suspicious Sequence: ${recentWindowCount} transfers in 5-min interval`] : []),
          ...(failedAttempts >= 1 ? [`${failedAttempts} Previous Failed Attempt(s)`] : []),
          ...(isGeoRisk ? [`Geo-Location Shift: Distance ${resolvedDistance.toFixed(1)} km exceeds home zone`] : [])
        ],
        recommended_action: requiresStepUp ? 'Step-Up Biometric Authentication (PIN + Live Face Scan) Required' : 'Allow via Security PIN Verification'
      };
    }

    const isBigAmount = numAmount >= thresholdLimit;
    const isSuspiciousBurstSequence = recentWindowCount >= 3;
    const requiresFace = Boolean(anomalyResult.requires_face_auth || anomalyResult.is_anomalous || isBigAmount || isSuspiciousBurstSequence);

    // 1. Check PIN for all transactions
    if (!pin) {
      return res.status(200).json({
        requiresPin: true,
        isBigAmount,
        requiresFace,
        failedAttempts,
        recentWindowCount,
        customerHistory,
        location: locationObj,
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

    // 2. Multi-Signal Step-Up Challenge (Suspicious Burst Sequence, High Amount, or High Risk Score)
    if (requiresFace && !faceVerified) {
      let challengeMsg = '';
      if (isSuspiciousBurstSequence || anomalyResult.signals?.short_interval_burst?.score >= 20) {
        challengeMsg = `Suspicious Micro-Payment Sequence: ${recentWindowCount} rapid transactions detected within 5 minutes. Live Face Biometric Scan is required to prevent automated account draining.`;
      } else if (isBigAmount) {
        challengeMsg = `High-Value Transfer Protocol: Transfer of ₹${numAmount.toFixed(2)} meets or exceeds your ₹${thresholdLimit.toFixed(2)} threshold. Live Biometric Face Authentication is required.`;
      } else {
        challengeMsg = `Risk Intelligence Alert (Risk Score ${anomalyResult.risk_score || 45}/100 • ${anomalyResult.contributing_risk_factors?.join(' • ') || 'Elevated Risk'}): Live Biometric Face Authentication is required.`;
      }

      return res.status(200).json({
        requiresFaceAuth: true,
        isBigAmount,
        isSuspiciousBurstSequence,
        riskScore: anomalyResult.risk_score,
        riskLevel: anomalyResult.risk_level,
        signals: anomalyResult.signals,
        anomalyEvaluation: anomalyResult,
        thresholdLimit,
        location: locationObj,
        failedAttempts,
        message: challengeMsg
      });
    }

    const clearanceStatus = requiresFace
      ? 'SETTLED & CLEARED (Multi-Factor: PIN + Biometric Face Scan)'
      : 'SETTLED & CLEARED (Authorized via Security PIN)';

    const txRecord = store.addTransaction({
      userId,
      senderEmail: userIdentifier,
      amount: numAmount,
      merchant,
      hour,
      location: locationObj,
      reconstructionError: anomalyResult.reconstruction_error,
      anomalyScore: anomalyResult.anomaly_score,
      isAnomalous: anomalyResult.is_anomalous,
      status: clearanceStatus
    });

    // Reset failed attempts upon successful authorized clearance
    store.resetFailedAttempts(userIdentifier);

    // Save permanently into MongoDB [securebank] database!
    try {
      await MongoTransaction.create({
        senderEmail: userIdentifier,
        receiverEmail: merchant,
        amount: numAmount,
        description: `Wire transfer to ${merchant}`,
        location: locationObj,
        velocity: Number(velocity) || 1.0,
        reconstructionError: anomalyResult.reconstruction_error,
        anomalyScore: anomalyResult.anomaly_score,
        isAnomalous: anomalyResult.is_anomalous,
        faceVerified: Boolean(faceVerified),
        status: clearanceStatus
      });
      console.log(`🍃 Successfully persisted transaction to MongoDB securebank with location: ${locationObj.city} (${locationObj.geoDistanceKm} km)`);
    } catch (mErr) {
      console.warn('MongoDB write notice:', mErr.message);
    }

    return res.json({
      success: true,
      transaction: txRecord,
      location: locationObj,
      anomalyEvaluation: anomalyResult
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const mongoTxs = await MongoTransaction.find().sort({ createdAt: -1 }).limit(25).lean();
    if (mongoTxs && mongoTxs.length > 0) {
      const formatted = mongoTxs.map(t => ({
        id: t._id.toString(),
        amount: t.amount,
        merchant: t.receiverEmail || t.description || 'External Clearing',
        timestamp: t.createdAt,
        reconstructionError: t.reconstructionError,
        location: t.location,
        status: t.status
      }));
      return res.json({ transactions: formatted });
    }
  } catch (e) {
    console.warn('Mongo fetch notice:', e.message);
  }
  const userId = req.user?.sub || 'usr_biovault_01';
  return res.json({ transactions: store.getTransactions(userId) });
};

exports.evaluateRisk = async (req, res) => {
  try {
    const { amount, velocity = 1.0, geo_distance, location, email, customBigAmountThreshold } = req.body;
    const userId = req.user?.sub || 'usr_biovault_01';
    const userIdentifier = email || userId;
    const numAmount = Number(amount) || 300.0;
    const storedThreshold = store.getThreshold(userIdentifier);
    const thresholdLimit = Number(customBigAmountThreshold) > 0 ? Number(customBigAmountThreshold) : storedThreshold;
    const failedAttempts = store.getFailedAttempts(userIdentifier);
    const recentWindowCount = store.getRecentTransactionsCount(userIdentifier, 5);
    const customerHistory = store.getCustomerHistoryStats(userIdentifier);

    let resolvedDistance = typeof geo_distance === 'number' ? Number(geo_distance) : 0.0;
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      const calcDist = calculateHaversineDistanceKm(18.5196, 73.8545, location.latitude, location.longitude);
      resolvedDistance = calcDist <= 60.0 ? 0.0 : calcDist;
    }

    try {
      const aiResp = await axios.post(`${AI_ENGINE_URL}/api/ml/anomaly-detect`, {
        amount: numAmount,
        customer_history_mean: customerHistory.mean,
        customer_history_std: customerHistory.std,
        recent_interval_tx_count: recentWindowCount,
        hour: new Date().getHours(),
        velocity: Number(velocity),
        geo_distance: resolvedDistance,
        failed_attempts: Number(failedAttempts)
      }, { timeout: 3500 });
      return res.json({
        success: true,
        thresholdLimit,
        recentWindowCount,
        customerHistory,
        riskScore: aiResp.data.risk_score,
        riskLevel: aiResp.data.risk_level,
        decision: aiResp.data.decision,
        requiresFaceAuth: aiResp.data.requires_face_auth || numAmount >= thresholdLimit || recentWindowCount >= 3,
        signals: aiResp.data.signals,
        contributing_risk_factors: aiResp.data.contributing_risk_factors,
        anomalyEvaluation: aiResp.data
      });
    } catch (e) {
      const isHighAmount = numAmount >= thresholdLimit;
      const isBurst = recentWindowCount >= 3;
      const fallbackRisk = Math.min(100, (isHighAmount ? 40 : 5) + (isBurst ? 35 : 0));
      return res.json({
        success: true,
        thresholdLimit,
        recentWindowCount,
        customerHistory,
        riskScore: fallbackRisk,
        riskLevel: fallbackRisk >= 36 ? 'MEDIUM' : 'LOW',
        requiresFaceAuth: fallbackRisk >= 36,
        contributing_risk_factors: isBurst ? [`Suspicious Burst: ${recentWindowCount} transfers in 5 min window`] : ['Routine spend profile']
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
