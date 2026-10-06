const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const store = require('../models/store');
const { ensureKeys } = require('../services/keyService');

const rpName = 'BioVault-AI Enterprise';
const rpID = 'localhost';
const origin = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const { privateKey } = ensureKeys();

function issueRS256Token(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      trustTier: user.trustTier
    },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '1h',
      issuer: 'https://auth.biovault.ai'
    }
  );
}

// 1. Biometric 128-D Facecard Registration
exports.registerFacecard = (req, res) => {
  try {
    const { userId = 'usr_biovault_01', descriptor } = req.body;
    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({ error: 'Valid 128-dimensional facial descriptor vector is required.' });
    }

    const existing = store.getBiometricDescriptor(userId);
    if (existing && existing.isLocked && new Date() < new Date(existing.lockExpiresAt)) {
      return res.status(403).json({
        error: 'Biometric template is locked under the 180-Day Immutability Security Policy to prevent Account Takeover (ATO).',
        lockExpiresAt: existing.lockExpiresAt
      });
    }

    const saved = store.saveBiometricDescriptor(userId, descriptor);
    return res.json({
      message: '128-D Biometric template successfully registered and locked.',
      registeredAt: saved.registeredAt,
      lockExpiresAt: saved.lockExpiresAt,
      policy: '180-Day Immutability Enforced'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 2. Biometric Verification
exports.verifyFacecard = (req, res) => {
  try {
    const { userId = 'usr_biovault_01', candidateDescriptor, threshold = 1.05 } = req.body;
    if (!candidateDescriptor || candidateDescriptor.length !== 128) {
      return res.status(400).json({ error: 'Candidate 128-D descriptor required.' });
    }

    const enrolled = store.getBiometricDescriptor(userId);
    if (!enrolled) {
      return res.status(404).json({ error: 'No enrolled biometric descriptor template found for user. Please register face first.' });
    }

    // Euclidean distance calculation: sqrt(sum (a_i - b_i)^2)
    let sumSq = 0.0;
    for (let i = 0; i < 128; i++) {
      const diff = enrolled.descriptor[i] - candidateDescriptor[i];
      sumSq += diff * diff;
    }
    const euclideanDistance = Math.sqrt(sumSq);
    const verified = euclideanDistance < threshold;

    if (!verified) {
      return res.status(401).json({
        verified: false,
        euclideanDistance: Number(euclideanDistance.toFixed(4)),
        threshold,
        message: 'Facial descriptor distance exceeds verification threshold.'
      });
    }

    const user = store.getUser(userId);
    const token = issueRS256Token(user);

    return res.json({
      verified: true,
      euclideanDistance: Number(euclideanDistance.toFixed(4)),
      threshold,
      confidence: Number((Math.max(0, 1 - euclideanDistance / threshold)).toFixed(4)),
      token,
      user
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 3. WebAuthn Registration Challenge
exports.getWebAuthnRegisterChallenge = async (req, res) => {
  try {
    const { userId = 'usr_biovault_01' } = req.body;
    const user = store.getUser(userId) || store.getUser('usr_biovault_01');

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id),
      userName: user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    store.setChallenge(user.id, options.challenge);
    return res.json(options);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 4. WebAuthn Register Verify
exports.verifyWebAuthnRegistration = async (req, res) => {
  try {
    const { userId = 'usr_biovault_01', credential } = req.body;
    const expectedChallenge = store.getChallenge(userId);
    if (!expectedChallenge) {
      return res.status(400).json({ error: 'Challenge expired or invalid.' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (verification.verified) {
      store.savePasskey(userId, verification.registrationInfo);
      return res.json({ verified: true, message: 'Hardware FIDO2 passkey bound successfully.' });
    }
    return res.status(400).json({ verified: false, error: 'Registration verification failed.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// 5. Get Session Profile
exports.getProfile = (req, res) => {
  const user = store.getUser(req.user?.sub || 'usr_biovault_01');
  const biometrics = store.getBiometricDescriptor(user.id);
  return res.json({
    user,
    hasBiometricsEnrolled: !!biometrics,
    biometricsLockExpiresAt: biometrics?.lockExpiresAt || null,
    passkeysCount: store.getPasskeys(user.id).length
  });
};
