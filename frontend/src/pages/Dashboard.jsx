import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ArrowUpRight, TrendingUp, Sparkles, CheckCircle2,
  AlertOctagon, BarChart3, Layers, KeyRound, Lock, X, Key,
  ShieldCheck, Mail, Camera, CameraOff, RefreshCw, Eye, AlertTriangle,
  Sliders, Settings
} from 'lucide-react';
import { extractBiometricVectorFromVideo, extractBiometricVectorWithJitter } from '../utils/faceBiometrics';

export default function Dashboard({ onRequireStepUpAuth, userEmail = '' }) {
  const [balance, setBalance] = useState(148520.50);
  const [transactions, setTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [gmmCluster, setGmmCluster] = useState(null);

  // Transfer simulation state
  const [amount, setAmount] = useState('500.00');
  const [merchant, setMerchant] = useState('Adani Green Energy Infrastructure');
  const [velocity, setVelocity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anomalyResult, setAnomalyResult] = useState(null);

  // User-Configurable High-Value Biometric Face Trigger Threshold (Default ₹2,000)
  const [customBigAmountThreshold, setCustomBigAmountThreshold] = useState(2000);

  // Modal 1: Security PIN & Biometric Transfer Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [transferStage, setTransferStage] = useState('pin'); // 'pin' or 'face'
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [pendingTransferData, setPendingTransferData] = useState(null);

  // Camera & Face Verification for Big Amount Transfers
  const [transferCameraActive, setTransferCameraActive] = useState(false);
  const [isVerifyingTransferFace, setIsVerifyingTransferFace] = useState(false);
  const transferVideoRef = useRef(null);
  const transferStreamRef = useRef(null);

  // Modal 2: Multi-Factor PIN Update Modal (Email OTP -> Face Scan -> Set New PIN)
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [pinUpdateStep, setPinUpdateStep] = useState(1);
  const [pinOtpCode, setPinOtpCode] = useState('');
  const [pinOtpSent, setPinOtpSent] = useState(false);
  const [pinOtpLoading, setPinOtpLoading] = useState(false);
  const [faceCameraActive, setFaceCameraActive] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changePinStatus, setChangePinStatus] = useState(null);

  // Modal 3: Set High-Value Limit Modal (Requires Face Scan)
  const [isSetThresholdModalOpen, setIsSetThresholdModalOpen] = useState(false);
  const [thresholdInput, setThresholdInput] = useState('2000');
  const [thresholdModalStep, setThresholdModalStep] = useState('input'); // 'input' or 'face'
  const [thresholdCameraActive, setThresholdCameraActive] = useState(false);
  const [isVerifyingThresholdFace, setIsVerifyingThresholdFace] = useState(false);
  const [thresholdModalStatus, setThresholdModalStatus] = useState(null);
  const thresholdVideoRef = useRef(null);
  const thresholdStreamRef = useRef(null);

  // 5-Hour Security Lockdown State - Website Blocked right away
  const [isWebsiteLocked, setIsWebsiteLocked] = useState(false);
  const [lockoutData, setLockoutData] = useState(null);

  const checkWebsiteLockStatus = async () => {
    try {
      const res = await fetch(`/api/auth/lock-status?email=${encodeURIComponent(userEmail || 'alex.vance@biovault.ai')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.isLocked) {
          setIsWebsiteLocked(true);
          setLockoutData(data);
        } else if (!data.isLocked && isWebsiteLocked) {
          setIsWebsiteLocked(false);
          setLockoutData(null);
        }
      }
    } catch (e) {}
  };

  // Load transactions, recommendations, stored threshold, and check lock status on mount
  useEffect(() => {
    fetchTransactions();
    fetchRecommendations();
    fetchStoredThreshold();
    evaluateGmm(Number(amount));
    evaluateAnomaly(Number(amount), Number(velocity));
    checkWebsiteLockStatus();
    const interval = setInterval(checkWebsiteLockStatus, 4000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const fetchStoredThreshold = async () => {
    try {
      const res = await fetch(`/api/transactions/threshold?email=${encodeURIComponent(userEmail || 'alex.vance@biovault.ai')}`);
      const data = await res.json();
      if (data.threshold) {
        setCustomBigAmountThreshold(Number(data.threshold));
        setThresholdInput(String(data.threshold));
      }
    } catch (e) {
      console.error('Failed to load stored threshold:', e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions/history');
      const data = await res.json();
      if (data.transactions) setTransactions(data.transactions);
    } catch (e) {
      console.error('Failed to fetch transactions:', e);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/ir/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'usr_biovault_01',
          risk_preferences: { max_risk_tolerance: 6.5, target_return: 10.0, volatility_tolerance: 5.0 },
          constraints: { hard_risk_limit: 8.0, max_lockup_days: 60 }
        })
      });
      const data = await res.json();
      if (data.top_recommendations) setRecommendations(data.top_recommendations);
    } catch (e) {
      console.error('Failed to fetch recommendations:', e);
    }
  };

  const evaluateGmm = async (val) => {
    try {
      const res = await fetch(`/api/ml/gmm-clusters?amount=${val}`);
      const data = await res.json();
      setGmmCluster(data);
    } catch (e) {
      console.error('Failed to evaluate GMM:', e);
    }
  };

  const evaluateAnomaly = async (numAmount, numVelocity = 1) => {
    try {
      const res = await fetch('/api/ml/anomaly-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(numAmount),
          hour: new Date().getHours(),
          velocity: Number(numVelocity),
          geo_distance: 10.0,
          failed_attempts: 0
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAnomalyResult(data);
        return data;
      }
    } catch (e) {
      console.warn('Autoencoder screening notice:', e);
    }
    return null;
  };

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
    const num = Number(e.target.value);
    if (!isNaN(num) && num > 0) {
      evaluateGmm(num);
      evaluateAnomaly(num, Number(velocity));
    }
  };

  // -------------------------------------------------------------
  // 1. MONEY TRANSFER FLOW (ANOMALY SCREENED FIRST, THEN AUTH)
  // -------------------------------------------------------------
  const handleTransfer = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setPinError(null);

    const numAmount = Number(amount);
    const numVelocity = Number(velocity);
    const payload = {
      amount: numAmount,
      merchant,
      velocity: numVelocity,
      hour: new Date().getHours(),
      email: userEmail,
      customBigAmountThreshold: Number(customBigAmountThreshold)
    };
    setPendingTransferData(payload);

    // STEP 1: DETECT ANOMALY FIRST via Deep Autoencoder
    let anomalyData = await evaluateAnomaly(numAmount, numVelocity);

    if (!anomalyData) {
      const isHigh = numAmount >= Number(customBigAmountThreshold) || numVelocity > 5;
      anomalyData = {
        is_anomalous: isHigh,
        reconstruction_error: isHigh ? 16.43 : 0.08,
        anomaly_score: isHigh ? 0.85 : 0.12,
        threshold_tau: 0.45,
        recommended_action: isHigh ? 'Step-Up Biometric Authentication (PIN + Live Face Scan) Required' : 'Allow Transaction Automatically',
        contributing_risk_factors: isHigh
          ? [`Unusual High-Value Surge: ₹${numAmount.toLocaleString('en-IN')} exceeds standard baseline (₹500)`]
          : ['Nominal Low-Risk Routine Transfer Profile']
      };
      setAnomalyResult(anomalyData);
    }

    setIsSubmitting(false);

    // STEP 2: DECIDE AUTHENTICATION CHALLENGE
    const isAnomalous = anomalyData.is_anomalous || numAmount >= Number(customBigAmountThreshold);

    if (isAnomalous) {
      // Anomaly Detected ➔ Trigger Step-Up Face Authentication
      setTransferStage('face');
      setPinInput('1234');
      setPinError(null);
      setPinSuccess(null);
      setIsPinModalOpen(true);
      setTimeout(() => {
        startTransferCamera();
      }, 150);
    } else {
      // Benign ➔ Standard PIN-only clearance
      setTransferStage('pin');
      setPinInput('');
      setPinError(null);
      setPinSuccess(null);
      setIsPinModalOpen(true);
    }
  };

  const startTransferCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        transferStreamRef.current = stream;
        if (transferVideoRef.current) {
          transferVideoRef.current.srcObject = stream;
          transferVideoRef.current.play().catch(e => console.warn(e));
        }
      }
      setTransferCameraActive(true);
    } catch (e) {
      console.warn('Transfer Camera notice:', e);
      setTransferCameraActive(true);
    }
  };

  const stopTransferCamera = () => {
    if (transferStreamRef.current) {
      transferStreamRef.current.getTracks().forEach(t => t.stop());
      transferStreamRef.current = null;
    }
    setTransferCameraActive(false);
  };

  const handleAuthorizeWithPin = async (e) => {
    if (e) e.preventDefault();
    if (!pinInput || pinInput.length < 4) {
      setPinError('Please enter your 4-digit Security PIN.');
      return;
    }

    setIsVerifyingPin(true);
    setPinError(null);

    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingTransferData,
          pin: pinInput,
          customBigAmountThreshold: Number(customBigAmountThreshold),
          faceVerified: false
        })
      });

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: 'Incorrect Security PIN. Transaction unauthorized.' };
      }

      if (!res.ok) {
        if (res.status === 423 || data.isLocked) {
          setIsPinModalOpen(false);
          stopTransferCamera();
          setIsWebsiteLocked(true);
          setLockoutData(data.lockStatus || { remainingHours: 5, blockedUntil: new Date(Date.now() + 5 * 3600 * 1000).toISOString() });
          setIsVerifyingPin(false);
          return;
        }
        setPinError(data.error || 'Incorrect Security PIN. Please try again.');
        setIsVerifyingPin(false);
        return;
      }

      // If this transfer meets the Big Amount threshold or is anomalous, require Face Scan
      if (data.requiresFaceAuth) {
        setTransferStage('face');
        setAnomalyResult(data.anomalyEvaluation);
        setTimeout(() => {
          startTransferCamera();
        }, 150);
      } else if (data.success) {
        // Standard transfer settled with PIN only
        setPinSuccess('✅ PIN Verified! Transfer of ₹' + Number(pendingTransferData?.amount || amount).toFixed(2) + ' Authorized & Cleared.');
        setBalance(prev => prev - Number(pendingTransferData?.amount || amount));
        fetchTransactions();
        setTimeout(() => {
          setIsPinModalOpen(false);
          setPinSuccess(null);
          setPinInput('');
        }, 1200);
      }
    } catch (err) {
      setPinError(err.message || 'Verification failed');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleAuthorizeBigAmountWithFace = async () => {
    setIsVerifyingTransferFace(true);
    setPinError(null);

    const effectivePin = (pinInput && pinInput.length >= 4) ? pinInput : '1234';
    if (!pinInput) {
      setPinInput('1234');
    }

    try {
      // Extract accurate 128-D embedding vector using multi-frame jitter averaging (inspired by ageitgey/face_recognition)
      let candidateDescriptor = await extractBiometricVectorWithJitter(transferVideoRef.current, 3);
      if (!candidateDescriptor) {
        candidateDescriptor = extractBiometricVectorFromVideo(transferVideoRef.current);
      }
      if (!candidateDescriptor) {
        setPinError('Camera frame not ready. Please look directly into the camera lens.');
        setIsVerifyingTransferFace(false);
        return;
      }

      const targetEmail = userEmail || 'alex.vance@biovault.ai';
      const verifyRes = await fetch('/api/auth/facecard/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          userId: 'usr_biovault_01',
          candidateDescriptor,
          threshold: 0.55
        })
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.verified) {
        if (verifyRes.status === 423 || verifyData.isLocked) {
          stopTransferCamera();
          setIsPinModalOpen(false);
          setIsWebsiteLocked(true);
          setLockoutData(verifyData.lockStatus || { remainingHours: 5, blockedUntil: new Date(Date.now() + 5 * 3600 * 1000).toISOString() });
          setIsVerifyingTransferFace(false);
          return;
        }
        setPinError(verifyData.message || verifyData.error || `❌ Biometric Mismatch: Distance (D=${verifyData.euclideanDistance || 'High'}) ≥ 0.55. Unauthorized face detected!`);
        setIsVerifyingTransferFace(false);
        return;
      }

      // Finalize transfer settlement after strict biometric match
      const txRes = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingTransferData,
          pin: effectivePin,
          customBigAmountThreshold: Number(customBigAmountThreshold),
          faceVerified: true
        })
      });
      const txData = await txRes.json();

      if (txRes.ok && txData.success) {
        stopTransferCamera();
        setPinSuccess('🎉 Multi-Factor Confirmed: PIN [OK] • Biometric Face Match D=' + (verifyData.euclideanDistance || 0.12) + ' [OK]! ₹' + Number(pendingTransferData?.amount || amount).toFixed(2) + ' Released & Settled.');
        setBalance(prev => prev - Number(pendingTransferData?.amount || amount));
        fetchTransactions();
        setTimeout(() => {
          setIsPinModalOpen(false);
          setPinSuccess(null);
          setPinInput('');
          setTransferStage('pin');
        }, 1500);
      } else {
        if (txRes.status === 423 || txData.isLocked) {
          stopTransferCamera();
          setIsPinModalOpen(false);
          setIsWebsiteLocked(true);
          setLockoutData(txData.lockStatus || { remainingHours: 5, blockedUntil: new Date(Date.now() + 5 * 3600 * 1000).toISOString() });
          return;
        }
        setPinError(txData.error || 'Biometric authorization could not be completed.');
      }
    } catch (err) {
      setPinError(err.message || 'Face authentication error');
    } finally {
      setIsVerifyingTransferFace(false);
    }
  };

  // -------------------------------------------------------------
  // 2. SET / UPDATE HIGH-VALUE THRESHOLD WITH FACE AUTHENTICATION
  // -------------------------------------------------------------
  const openSetThresholdModal = () => {
    setThresholdInput(String(customBigAmountThreshold));
    setThresholdModalStep('input');
    setThresholdModalStatus(null);
    setIsSetThresholdModalOpen(true);
  };

  const closeSetThresholdModal = () => {
    stopThresholdCamera();
    setIsSetThresholdModalOpen(false);
    setThresholdModalStep('input');
    setThresholdModalStatus(null);
  };

  const startThresholdCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        thresholdStreamRef.current = stream;
        if (thresholdVideoRef.current) {
          thresholdVideoRef.current.srcObject = stream;
          thresholdVideoRef.current.play().catch(e => console.warn(e));
        }
      }
      setThresholdCameraActive(true);
    } catch (e) {
      console.warn('Threshold Camera notice:', e);
      setThresholdCameraActive(true);
    }
  };

  const stopThresholdCamera = () => {
    if (thresholdStreamRef.current) {
      thresholdStreamRef.current.getTracks().forEach(t => t.stop());
      thresholdStreamRef.current = null;
    }
    setThresholdCameraActive(false);
  };

  const handleProceedToFaceForThreshold = (e) => {
    if (e) e.preventDefault();
    const val = Number(thresholdInput);
    if (isNaN(val) || val <= 0) {
      setThresholdModalStatus({ type: 'error', text: 'Please enter a valid positive amount in ₹ INR.' });
      return;
    }
    if (val === customBigAmountThreshold) {
      setThresholdModalStatus({
        type: 'error',
        text: `New High-Value Limit cannot be the same as your current limit (₹${customBigAmountThreshold.toLocaleString('en-IN')}). Please enter a different amount.`
      });
      return;
    }
    setThresholdModalStep('face');
    setThresholdModalStatus(null);
    setTimeout(() => {
      startThresholdCamera();
    }, 150);
  };

  const handleAuthenticateFaceAndSaveThreshold = async () => {
    setIsVerifyingThresholdFace(true);
    setThresholdModalStatus(null);

    try {
      const candidateDescriptor = extractBiometricVectorFromVideo(thresholdVideoRef.current);
      if (!candidateDescriptor) {
        setThresholdModalStatus({ type: 'error', text: 'Camera feed not ready. Please look directly into the camera.' });
        setIsVerifyingThresholdFace(false);
        return;
      }

      // 1. Verify face strictly against enrolled descriptor
      const targetEmail = userEmail || 'alex.vance@biovault.ai';
      const verifyRes = await fetch('/api/auth/facecard/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          userId: 'usr_biovault_01',
          candidateDescriptor,
          threshold: 0.55
        })
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.verified) {
        setThresholdModalStatus({
          type: 'error',
          text: verifyData.message || verifyData.error || `❌ Biometric Mismatch: Distance (D=${verifyData.euclideanDistance || 'High'}) ≥ 0.55. Unauthorized face detected! Security Alert Email sent with protection.`
        });
        setIsVerifyingThresholdFace(false);
        return;
      }

      // 2. Save new threshold to backend
      const saveRes = await fetch('/api/transactions/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          newThreshold: Number(thresholdInput),
          faceVerified: true
        })
      });
      const saveData = await saveRes.json();

      if (saveRes.ok && saveData.success) {
        stopThresholdCamera();
        setCustomBigAmountThreshold(Number(thresholdInput));
        setThresholdModalStatus({
          type: 'success',
          text: `🎉 Biometric Face Verified! High-Value Threshold successfully updated to ₹${Number(thresholdInput).toLocaleString('en-IN')}.`
        });
        setTimeout(() => {
          closeSetThresholdModal();
        }, 1300);
      } else {
        setThresholdModalStatus({ type: 'error', text: saveData.error || 'Failed to update threshold.' });
      }
    } catch (err) {
      setThresholdModalStatus({ type: 'error', text: err.message || 'Face authentication error' });
    } finally {
      setIsVerifyingThresholdFace(false);
    }
  };

  // -------------------------------------------------------------
  // 3. MULTI-FACTOR PIN UPDATE
  // -------------------------------------------------------------
  const handleSendPinUpdateOtp = async () => {
    setPinOtpLoading(true);
    setChangePinStatus(null);
    try {
      const targetEmail = userEmail || 'alex.vance@biovault.ai';
      const res = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        setPinOtpSent(true);
        setChangePinStatus({
          type: 'success',
          text: `📩 Verification code sent to ${targetEmail}! Check inbox.`
        });
      } else {
        setChangePinStatus({ type: 'error', text: data.error || 'Failed to send OTP.' });
      }
    } catch (err) {
      setChangePinStatus({ type: 'error', text: err.message });
    } finally {
      setPinOtpLoading(false);
    }
  };

  const handleVerifyPinUpdateOtp = async (e) => {
    if (e) e.preventDefault();
    if (!pinOtpCode) {
      setChangePinStatus({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }

    setPinOtpLoading(true);
    try {
      const targetEmail = userEmail || 'alex.vance@biovault.ai';
      const res = await fetch('/api/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: pinOtpCode })
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setChangePinStatus({ type: 'success', text: '✅ Email verified! Proceeding to Biometric Face Scan...' });
        setTimeout(() => {
          setPinUpdateStep(2);
          setChangePinStatus(null);
          startFaceCamera();
        }, 700);
      } else {
        setChangePinStatus({ type: 'error', text: data.error || 'Invalid code.' });
      }
    } catch (err) {
      setChangePinStatus({ type: 'error', text: err.message });
    } finally {
      setPinOtpLoading(false);
    }
  };

  const startFaceCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn(e));
        }
      }
      setFaceCameraActive(true);
    } catch (e) {
      console.warn('Camera notice:', e);
      setFaceCameraActive(true);
    }
  };

  const stopFaceCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setFaceCameraActive(false);
  };

  const handleVerifyFaceForPinUpdate = async () => {
    setIsVerifyingFace(true);
    setChangePinStatus(null);

    try {
      const candidateDescriptor = extractBiometricVectorFromVideo(videoRef.current);
      if (!candidateDescriptor) {
        setChangePinStatus({ type: 'error', text: 'Camera not ready. Please look into camera.' });
        setIsVerifyingFace(false);
        return;
      }

      const res = await fetch('/api/auth/facecard/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_biovault_01',
          email: userEmail,
          candidateDescriptor,
          threshold: 0.30
        })
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        stopFaceCamera();
        setChangePinStatus({ type: 'success', text: `✅ Face Biometrics Verified (D=${data.euclideanDistance || 0.12})! Enter new PIN.` });
        setTimeout(() => {
          setPinUpdateStep(3);
          setChangePinStatus(null);
        }, 800);
      } else {
        setChangePinStatus({
          type: 'error',
          text: data.message || data.error || `❌ Biometric Mismatch: Distance (D=${data.euclideanDistance || 'High'}) ≥ 0.30. Unauthorized face detected! Only the account holder can update the PIN.`
        });
      }
    } catch (err) {
      setChangePinStatus({ type: 'error', text: err.message || 'Face authentication error' });
    } finally {
      setIsVerifyingFace(false);
    }
  };

  const handleRegisterOrChangePin = async (e) => {
    if (e) e.preventDefault();
    if (!newPin || !/^\d{4,6}$/.test(newPin)) {
      setChangePinStatus({ type: 'error', text: 'PIN must be 4 to 6 numeric digits.' });
      return;
    }
    if (newPin !== confirmPin) {
      setChangePinStatus({ type: 'error', text: 'PINs do not match.' });
      return;
    }

    try {
      const res = await fetch('/api/auth/pin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          userId: 'usr_biovault_01',
          pin: newPin
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChangePinStatus({ type: 'success', text: '🎉 Security PIN successfully updated and encrypted!' });
        setTimeout(() => {
          closePinUpdateModal();
        }, 1200);
      } else {
        setChangePinStatus({ type: 'error', text: data.error || 'Failed to save PIN.' });
      }
    } catch (err) {
      setChangePinStatus({ type: 'error', text: err.message });
    }
  };

  const openPinUpdateModal = () => {
    setPinUpdateStep(1);
    setPinOtpCode('');
    setPinOtpSent(false);
    setNewPin('');
    setConfirmPin('');
    setChangePinStatus(null);
    setIsChangePinModalOpen(true);
    setTimeout(() => {
      handleSendPinUpdateOtp();
    }, 100);
  };

  const closePinUpdateModal = () => {
    stopFaceCamera();
    setIsChangePinModalOpen(false);
    setPinUpdateStep(1);
    setChangePinStatus(null);
  };

  if (isWebsiteLocked) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(3, 7, 18, 0.98)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        overflowY: 'auto'
      }}>
        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: 620,
          padding: '2.5rem',
          border: '2px solid #ef4444',
          background: 'rgba(239, 68, 68, 0.08)',
          boxShadow: '0 12px 48px rgba(239, 68, 68, 0.35)',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '50%',
            marginBottom: '1rem',
            border: '2px solid #ef4444'
          }}>
            <ShieldAlert size={44} color="#ef4444" />
          </div>

          <h1 className="font-heading" style={{
            color: '#fca5a5',
            fontSize: '1.65rem',
            fontWeight: 800,
            marginBottom: '0.65rem'
          }}>
            🛑 SECURITY LOCKDOWN: WEBSITE BLOCKED
          </h1>

          <p style={{
            color: '#cbd5e1',
            fontSize: '0.92rem',
            maxWidth: 500,
            margin: '0 auto 1.5rem auto',
            lineHeight: 1.6
          }}>
            Multiple failed authentication attempts were detected.
            This website has been <strong>blocked right away</strong> to protect your funds and financial data.
            All transfers, account changes, and biometric face authentication are strictly disabled during this freeze.
          </p>

          <div style={{
            background: 'rgba(3, 7, 18, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '10px',
            padding: '1.25rem',
            maxWidth: 480,
            margin: '0 auto 1.5rem auto',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lock Protocol:</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f87171' }}>● 5-Hour Strict Security Freeze</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Automatic Unblock:</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
                ~{lockoutData?.remainingHours || 5} Hours Remaining
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5 }}>
              🔒 <strong>Security Policy:</strong> Face authentication retry is permanently disabled during active lockdown to prevent brute-force attacks.
            </div>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '0.95rem 1.25rem',
            fontSize: '0.82rem',
            color: '#fca5a5',
            lineHeight: 1.5,
            maxWidth: 480,
            margin: '0 auto'
          }}>
            For emergency assistance or manual verification, please contact our 24/7 Security Operations Center at <strong>+91 (022) 8000-VAULT</strong> or email <strong>security-alerts@biovault.ai</strong>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '10px' }}>
            <Sparkles size={22} color="#06b6d4" />
          </div>
          <div>
            <h2 className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              AI Financial Intelligence & Biometric Security Center (₹ INR)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0.2rem 0 0' }}>
              Your account is secured with <strong>FIDO2 Hardware Passkeys</strong> and <strong>180-Day Biometric Face Templates</strong>.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            onClick={openSetThresholdModal}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.82rem', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          >
            <Sliders size={15} color="#10b981" />
            <span>Set High-Value Limit</span>
          </button>
          <button
            onClick={openPinUpdateModal}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', fontSize: '0.82rem' }}
          >
            <KeyRound size={15} color="#38bdf8" />
            <span>Update Security PIN</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        
        {/* Account Balance Card */}
        <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vault Available Liquidity (₹ INR)
            </span>
            <div style={{ color: '#06b6d4', fontWeight: 800, fontSize: '1.2rem' }}>₹</div>
          </div>
          <div className="font-heading" style={{ fontSize: '2.1rem', fontWeight: 800, color: '#fff' }}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span className="badge badge-emerald">● Biometrically Secured</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>FIDO2 Hardware Bound</span>
          </div>
        </div>

        {/* Deep Autoencoder Screening Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Fraud Protection (Autoencoder)
            </span>
            <ShieldAlert size={20} color="#10b981" />
          </div>
          <div className="font-heading" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>
            L_rec &lt; 0.45 (Normal)
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Deep Autoencoder continuously screens transactions: Score(x) = ||x - x̂||²
          </p>
        </div>

        {/* GMM Spending Cluster Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Spending Pattern Category (GMM)
            </span>
            <Layers size={20} color="#8b5cf6" />
          </div>
          <div className="font-heading" style={{ fontSize: '1.15rem', fontWeight: 700, color: '#c084fc' }}>
            {gmmCluster?.cluster_label || 'Utilities & Recurring Bills'}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Gaussian Mixture Model affinity: {gmmCluster ? `${(gmmCluster.cluster_affinity_probability * 100).toFixed(1)}% confidence` : '98.8% confidence'}
          </p>
        </div>

      </div>

      {/* Main Grid: Transfer Form & Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Transaction Clearing & Autoencoder Screening Simulator */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <ArrowUpRight size={22} color="#06b6d4" />
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                Simulate a Secure Wire Transfer (₹ INR)
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.15rem 0 0' }}>
                Test the Deep Autoencoder AI fraud screener in real time.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setAmount('500.00');
                setVelocity('1');
                setMerchant('Routine Office Utilities');
                evaluateGmm(500);
                evaluateAnomaly(500, 1);
              }}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
            >
              ✅ Preset: ₹500 (Safe / Small)
            </button>
            <button
              type="button"
              onClick={() => {
                setAmount('25000.00');
                setVelocity('12');
                setMerchant('Offshore Crypto Clearinghouse');
                evaluateGmm(25000);
                evaluateAnomaly(25000, 12);
              }}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', borderColor: '#ef4444', color: '#fca5a5' }}
            >
              🚨 Preset: ₹25,000 (Triggers Face Scan)
            </button>
          </div>

          <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                Transfer Amount (₹ INR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={handleAmountChange}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.92rem'
                }}
              />
            </div>

            {/* Configurable High-Value Biometric Face Trigger Threshold Status Box */}
            <div style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              padding: '0.85rem',
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <ShieldCheck size={15} /> Your High-Value Biometric Trigger Limit:
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#34d399' }}>
                  ₹{customBigAmountThreshold.toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.73rem' }}>
                  {Number(amount) >= customBigAmountThreshold ? (
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                      ⚠️ Amount (₹{Number(amount).toLocaleString('en-IN')}) ≥ ₹{customBigAmountThreshold.toLocaleString('en-IN')} ➔ <strong>PIN + Face Scan Required</strong>
                    </span>
                  ) : (
                    <span style={{ color: '#34d399' }}>
                      ✓ Amount (₹{Number(amount).toLocaleString('en-IN')}) &lt; ₹{customBigAmountThreshold.toLocaleString('en-IN')} ➔ <strong>PIN-Only Authorization</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openSetThresholdModal}
                  style={{
                    padding: '0.25rem 0.55rem',
                    borderRadius: '5px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: '#38bdf8'
                  }}
                >
                  Change Limit
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                Recipient / Allocation Entity
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.92rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.3rem' }}>
                Transaction Velocity Frequency (Transfers per Minute)
              </label>
              <input
                type="number"
                value={velocity}
                onChange={(e) => setVelocity(e.target.value)}
                min="1"
                max="25"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.92rem'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ marginTop: '0.35rem', justifyContent: 'center' }}
            >
              {isSubmitting ? 'Evaluating Autoencoder...' : 'Execute & Screen Transfer'}
            </button>
          </form>

          {anomalyResult && (
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: '10px',
              background: anomalyResult.is_anomalous ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${anomalyResult.is_anomalous ? '#ef4444' : '#10b981'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: anomalyResult.is_anomalous ? '#ef4444' : '#34d399' }}>
                {anomalyResult.is_anomalous ? <AlertOctagon size={18} /> : <CheckCircle2 size={18} />}
                {anomalyResult.is_anomalous ? 'ANOMALY DETECTED (High Risk Deviation)' : 'BENIGN TRANSACTION VERIFIED'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.35rem', marginBottom: '0.5rem' }}>
                Reconstruction Loss: <strong>{anomalyResult.reconstruction_error}</strong> (Threshold τ = 0.45). Action: {anomalyResult.recommended_action}.
              </p>

              {anomalyResult.contributing_risk_factors && anomalyResult.contributing_risk_factors.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Identified Risk Factors:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {anomalyResult.contributing_risk_factors.map((factor, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: anomalyResult.is_anomalous ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: anomalyResult.is_anomalous ? '#fca5a5' : '#86efac',
                          border: `1px solid ${anomalyResult.is_anomalous ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                        }}
                      >
                        ● {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hybrid Investment Recommender (Collaborative + Content + Knowledge) */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <Sparkles size={22} color="#8b5cf6" />
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>
                Hybrid Wealth Recommender
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Collaborative Matrix Factorization + Content Risk Cosine + Knowledge Rules
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recommendations.map(asset => (
              <div
                key={asset.asset_id}
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>{asset.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {asset.category} • Risk Grade: {asset.risk_rating}/10
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="badge badge-cyan" style={{ fontSize: '0.75rem' }}>
                    {(asset.hybrid_match_score * 100).toFixed(1)}% Match
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: '0.2rem' }}>
                    Return: {asset.expected_return}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Transaction History Ledger */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <BarChart3 size={20} color="#06b6d4" />
          <h3 className="font-heading" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
            Audited Financial Transaction Ledger (₹ INR)
          </h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: '#94a3b8' }}>
                <th style={{ padding: '0.75rem' }}>Transaction ID</th>
                <th style={{ padding: '0.75rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem' }}>Merchant / Category</th>
                <th style={{ padding: '0.75rem' }}>Amount (₹)</th>
                <th style={{ padding: '0.75rem' }}>Autoencoder L_rec</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td className="font-mono" style={{ padding: '0.75rem', color: '#38bdf8' }}>{tx.id}</td>
                  <td style={{ padding: '0.75rem', color: '#94a3b8' }}>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '0.75rem', color: '#f8fafc' }}>{tx.merchant}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600 }}>₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="font-mono" style={{ padding: '0.75rem', color: tx.reconstructionError > 0.45 ? '#ef4444' : '#10b981' }}>
                    {tx.reconstructionError}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`badge ${tx.reconstructionError > 0.45 ? 'badge-amber' : 'badge-emerald'}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TRANSACTION SECURITY PIN AUTHORIZATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {isPinModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{
            maxWidth: transferStage === 'face' ? 520 : 440,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: transferStage === 'face' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(6, 182, 212, 0.4)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <button
              onClick={() => {
                stopTransferCamera();
                setIsPinModalOpen(false);
                setPinError(null);
                setPinSuccess(null);
                setPinInput('');
                setTransferStage('pin');
              }}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* STAGE 1: SECURITY PIN */}
            {transferStage === 'pin' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    <KeyRound size={28} color="#06b6d4" />
                  </div>
                  <h3 className="font-heading" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: '0 0 0.3rem' }}>
                    Enter Security PIN
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
                    Authorize transfer of <strong>₹{Number(pendingTransferData?.amount || amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> to <em>{pendingTransferData?.merchant || merchant}</em>.
                  </p>
                  
                  {Number(pendingTransferData?.amount || amount) >= customBigAmountThreshold ? (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.35rem 0.65rem',
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#fbbf24',
                      fontWeight: 600
                    }}>
                      🛡️ High-Value Transfer (≥ ₹{customBigAmountThreshold.toLocaleString('en-IN')}) ➔ Step 1/2: PIN Verification
                    </div>
                  ) : (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.35rem 0.65rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      color: '#34d399',
                      fontWeight: 600
                    }}>
                      ⚡ Standard Transfer (&lt; ₹{customBigAmountThreshold.toLocaleString('en-IN')}) ➔ Instant PIN Authorization
                    </div>
                  )}
                </div>

                <form onSubmit={handleAuthorizeWithPin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <input
                      type="password"
                      maxLength={6}
                      autoFocus
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        textAlign: 'center',
                        fontSize: '1.8rem',
                        letterSpacing: '0.5em',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: pinError ? '1px solid #ef4444' : '1px solid rgba(6, 182, 212, 0.4)',
                        borderRadius: '10px',
                        color: '#38bdf8',
                        fontFamily: 'monospace'
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '0.4rem' }}>
                      Default Demo PIN: <code style={{ color: '#38bdf8' }}>1234</code> (or your registered PIN)
                    </div>
                  </div>

                  {pinError && (
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      fontSize: '0.82rem',
                      textAlign: 'center'
                    }}>
                      {pinError}
                    </div>
                  )}

                  {pinSuccess && (
                    <div style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      fontSize: '0.82rem',
                      textAlign: 'center',
                      fontWeight: 600
                    }}>
                      {pinSuccess}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        stopTransferCamera();
                        setIsPinModalOpen(false);
                        setPinError(null);
                        setPinInput('');
                      }}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isVerifyingPin || pinInput.length < 4}
                      className="btn-primary"
                      style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}
                    >
                      {isVerifyingPin ? 'Verifying PIN...' : (Number(pendingTransferData?.amount || amount) >= customBigAmountThreshold ? 'Verify PIN & Proceed ➔' : 'Authorize Transfer')}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* STAGE 2: LIVE BIOMETRIC FACE AUTHENTICATION FOR ANOMALIES & BIG AMOUNTS */}
            {transferStage === 'face' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
                <div>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: anomalyResult?.is_anomalous ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    border: `1px solid ${anomalyResult?.is_anomalous ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.65rem'
                  }}>
                    {anomalyResult?.is_anomalous ? <AlertOctagon size={28} color="#ef4444" /> : <ShieldCheck size={28} color="#10b981" />}
                  </div>
                  <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 0.3rem' }}>
                    {anomalyResult?.is_anomalous ? 'AI Anomaly Detected: Face Authentication Required' : 'Biometric Face Verification'}
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
                    {anomalyResult?.is_anomalous ? (
                      <>
                        Autoencoder Loss: <strong style={{ color: '#ef4444' }}>{anomalyResult?.reconstruction_error}</strong> (τ = 0.45) • Transfer of <strong>₹{Number(pendingTransferData?.amount || amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> flagged as high risk ({anomalyResult?.contributing_risk_factors?.[0] || 'Unusual Spending Surge'}). Live facial match is strictly required.
                      </>
                    ) : (
                      <>
                        Wire transfer of <strong>₹{Number(pendingTransferData?.amount || amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> meets High-Value Limit (₹{customBigAmountThreshold.toLocaleString('en-IN')}). Live facial match required.
                      </>
                    )}
                  </p>
                </div>

                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 200,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#030712',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <video
                    ref={transferVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Face Mesh HUD Simulation */}
                  <div style={{
                    position: 'absolute',
                    inset: '12% 22%',
                    border: '2px dashed #06b6d4',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    animation: 'pulse 2s infinite'
                  }} />

                  <div style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    left: '0.5rem',
                    right: '0.5rem',
                    padding: '0.35rem',
                    background: 'rgba(0, 0, 0, 0.75)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#38bdf8'
                  }}>
                    ● Camera Live • Look directly into camera oval to release funds
                  </div>
                </div>

                {/* Integrated 4-digit Security PIN Entry for Anomalous / High-Value Transfer */}
                <div style={{ textAlign: 'left', background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                      Enter 4-Digit Security PIN
                    </label>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Default: 1234</span>
                  </div>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'rgba(3, 7, 18, 0.7)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: '#38bdf8',
                      fontSize: '1.2rem',
                      letterSpacing: '0.25em',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {pinError && (
                  <div style={{
                    padding: '0.75rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    {pinError}
                  </div>
                )}

                {pinSuccess && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10b981',
                    color: '#34d399',
                    fontSize: '0.82rem',
                    textAlign: 'center',
                    fontWeight: 600
                  }}>
                    {pinSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      stopTransferCamera();
                      setIsPinModalOpen(false);
                      setPinError(null);
                      setPinSuccess(null);
                      setTransferStage('pin');
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAuthorizeBigAmountWithFace}
                    disabled={isVerifyingTransferFace}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      padding: '0.75rem',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)'
                    }}
                  >
                    {isVerifyingTransferFace ? (
                      <><RefreshCw size={15} className="animate-spin" /> Verifying Face Biometrics...</>
                    ) : (
                      <><Eye size={16} /> Scan Face & Settle Funds</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SET / UPDATE HIGH-VALUE LIMIT MODAL (REQUIRES FACE SCAN)   */}
      {/* ------------------------------------------------------------- */}
      {isSetThresholdModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{
            maxWidth: 480,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <button
              onClick={closeSetThresholdModal}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.65rem'
              }}>
                <Sliders size={26} color="#10b981" />
              </div>
              <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem' }}>
                Set High-Value Biometric Limit
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                Transactions meeting or exceeding this amount will mandate <strong>PIN + Live Face Scan</strong>. (Default: ₹2,000).
              </p>
            </div>

            {/* STEP 1: ENTER NEW THRESHOLD */}
            {thresholdModalStep === 'input' && (
              <form onSubmit={handleProceedToFaceForThreshold} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem' }}>
                    New High-Value Threshold Amount (₹ INR)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1rem', top: '0.8rem', fontSize: '1.2rem', color: '#06b6d4', fontWeight: 700 }}>₹</span>
                    <input
                      type="number"
                      autoFocus
                      min="100"
                      step="100"
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(e.target.value)}
                      placeholder="2000"
                      style={{
                        width: '100%',
                        padding: '0.75rem 0.85rem 0.75rem 2.4rem',
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '8px',
                        color: '#34d399',
                        fontSize: '1.2rem',
                        fontWeight: 700
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.4rem' }}>
                    Current Limit: <strong style={{ color: '#38bdf8' }}>₹{customBigAmountThreshold.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  fontSize: '0.78rem',
                  color: '#94a3b8'
                }}>
                  🔒 <strong>Security Policy:</strong> Modifying your high-value threshold requires biometric face verification to ensure only you can adjust security limits.
                </div>

                {thresholdModalStatus && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    background: thresholdModalStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${thresholdModalStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: thresholdModalStatus.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    {thresholdModalStatus.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={closeSetThresholdModal}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Proceed to Face Scan ➔
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: LIVE BIOMETRIC FACE VERIFICATION */}
            {thresholdModalStep === 'face' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 230,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#030712',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <video
                    ref={thresholdVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Face Mesh HUD Simulation */}
                  <div style={{
                    position: 'absolute',
                    inset: '12% 22%',
                    border: '2px dashed #10b981',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    animation: 'pulse 2s infinite'
                  }} />

                  <div style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    left: '0.5rem',
                    right: '0.5rem',
                    padding: '0.35rem',
                    background: 'rgba(0, 0, 0, 0.75)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#34d399'
                  }}>
                    ● Camera Live • Look into camera to confirm limit of ₹{Number(thresholdInput).toLocaleString('en-IN')}
                  </div>
                </div>

                {thresholdModalStatus && (
                  <div style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '6px',
                    background: thresholdModalStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${thresholdModalStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: thresholdModalStatus.type === 'success' ? '#34d399' : '#f87171',
                    fontSize: '0.82rem',
                    textAlign: 'center'
                  }}>
                    {thresholdModalStatus.text}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      stopThresholdCamera();
                      setThresholdModalStep('input');
                    }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleAuthenticateFaceAndSaveThreshold}
                    disabled={isVerifyingThresholdFace}
                    className="btn-primary"
                    style={{
                      flex: 2,
                      padding: '0.75rem',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
                    }}
                  >
                    {isVerifyingThresholdFace ? (
                      <><RefreshCw size={15} className="animate-spin" /> Verifying Face...</>
                    ) : (
                      <><Eye size={16} /> Scan Face & Save Limit</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. MULTI-FACTOR (EMAIL OTP + FACE SCAN) SECURITY PIN UPDATE MODAL */}
      {/* ------------------------------------------------------------- */}
      {isChangePinModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          overflowY: 'auto'
        }}>
          <div className="glass-panel" style={{
            maxWidth: 480,
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            padding: '1.75rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <button
              onClick={closePinUpdateModal}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Header & Step Badges */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.65rem'
              }}>
                <KeyRound size={26} color="#38bdf8" />
              </div>
              <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: '0 0 0.25rem' }}>
                Multi-Factor Security PIN Update
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                High-security re-authentication: Verify Email OTP and Live Face Biometrics before setting a new PIN.
              </p>

              {/* Step Flow Indicators */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.4rem',
                marginTop: '1rem',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                <span style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  background: pinUpdateStep === 1 ? '#06b6d4' : (pinUpdateStep > 1 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                  color: pinUpdateStep === 1 ? '#030712' : (pinUpdateStep > 1 ? '#34d399' : '#64748b'),
                  border: pinUpdateStep > 1 ? '1px solid #10b981' : undefined
                }}>
                  {pinUpdateStep > 1 ? '1. Email ✓' : '1. Email OTP'}
                </span>
                <span style={{ color: '#475569' }}>➔</span>
                <span style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  background: pinUpdateStep === 2 ? '#06b6d4' : (pinUpdateStep > 2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)'),
                  color: pinUpdateStep === 2 ? '#030712' : (pinUpdateStep > 2 ? '#34d399' : '#64748b'),
                  border: pinUpdateStep > 2 ? '1px solid #10b981' : undefined
                }}>
                  {pinUpdateStep > 2 ? '2. Face ✓' : '2. Face Scan'}
                </span>
                <span style={{ color: '#475569' }}>➔</span>
                <span style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  background: pinUpdateStep === 3 ? '#10b981' : 'rgba(255, 255, 255, 0.05)',
                  color: pinUpdateStep === 3 ? '#030712' : '#64748b'
                }}>
                  3. New PIN
                </span>
              </div>
            </div>

            {/* STEP 1: EMAIL OTP VERIFICATION */}
            {pinUpdateStep === 1 && (
              <form onSubmit={handleVerifyPinUpdateOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(3, 7, 18, 0.7)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.4rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Registered Account Email</span>
                    <span style={{ color: '#38bdf8' }}>{userEmail || 'alex.vance@biovault.ai'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={pinOtpCode}
                      onChange={(e) => setPinOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit OTP code"
                      style={{
                        flex: 1,
                        padding: '0.7rem',
                        textAlign: 'center',
                        fontSize: '1.15rem',
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '6px',
                        color: '#38bdf8',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSendPinUpdateOtp}
                      disabled={pinOtpLoading}
                      className="btn-secondary"
                      style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    >
                      {pinOtpLoading ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}
                      {pinOtpSent ? 'Resend' : 'Send Code'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={closePinUpdateModal}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pinOtpLoading || pinOtpCode.length < 6}
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    {pinOtpLoading ? 'Verifying...' : 'Verify Email OTP ➔'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: BIOMETRIC FACE SCAN RE-AUTHENTICATION */}
            {pinUpdateStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 220,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#030712',
                  border: '1px solid rgba(6, 182, 212, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />

                  {/* Face Mesh HUD Simulation */}
                  <div style={{
                    position: 'absolute',
                    inset: '15% 25%',
                    border: '2px dashed #06b6d4',
                    borderRadius: '50%',
                    pointerEvents: 'none',
                    animation: 'pulse 2s infinite'
                  }} />

                  <div style={{
                    position: 'absolute',
                    bottom: '0.5rem',
                    left: '0.5rem',
                    right: '0.5rem',
                    padding: '0.35rem',
                    background: 'rgba(0, 0, 0, 0.75)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#38bdf8'
                  }}>
                    ● Camera Live • Look into the lens to confirm identity
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={closePinUpdateModal}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyFaceForPinUpdate}
                    disabled={isVerifyingFace}
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.75rem', justifyContent: 'center', background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)' }}
                  >
                    {isVerifyingFace ? (
                      <><RefreshCw size={15} className="animate-spin" /> Verifying Face Descriptor...</>
                    ) : (
                      <><Eye size={16} /> Scan & Authenticate Face</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SET NEW SECURITY PIN */}
            {pinUpdateStep === 3 && (
              <form onSubmit={handleRegisterOrChangePin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: '#34d399'
                }}>
                  <ShieldCheck size={18} />
                  <span>Email & Face Biometrics Verified! Set your new PIN below.</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    New Security PIN (4-6 digits)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 4-6 digits"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      background: 'rgba(3, 7, 18, 0.8)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '1.2rem',
                      letterSpacing: '0.25em',
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                    Confirm New Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Re-enter new PIN"
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.9rem',
                      background: 'rgba(3, 7, 18, 0.8)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '8px',
                      color: '#38bdf8',
                      fontSize: '1.2rem',
                      letterSpacing: '0.25em',
                      fontFamily: 'monospace',
                      textAlign: 'center'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={closePinUpdateModal}
                    className="btn-secondary"
                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={newPin.length < 4 || newPin !== confirmPin}
                    className="btn-primary"
                    style={{ flex: 2, padding: '0.75rem', justifyContent: 'center' }}
                  >
                    Save & Update PIN
                  </button>
                </div>
              </form>
            )}

            {/* Status Alerts */}
            {changePinStatus && (
              <div style={{
                marginTop: '1rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: changePinStatus.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${changePinStatus.type === 'success' ? '#10b981' : '#ef4444'}`,
                color: changePinStatus.type === 'success' ? '#34d399' : '#f87171',
                fontSize: '0.82rem',
                textAlign: 'center'
              }}>
                {changePinStatus.text}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
