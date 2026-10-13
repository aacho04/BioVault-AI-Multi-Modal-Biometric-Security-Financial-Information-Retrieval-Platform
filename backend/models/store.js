const crypto = require('crypto');

/**
 * Enterprise In-Memory & Persistent Storage Engine for BioVault-AI.
 * Manages Users, 180-Day Biometric Template Locks, Passkeys, and Transactions.
 */
class BioVaultStore {
  constructor() {
    this.users = new Map();
    this.biometrics = new Map(); // userId -> { descriptor: number[], registeredAt: Date, lockExpiresAt: Date }
    this.passkeys = new Map();   // userId -> [ { credentialID, publicKey, counter } ]
    this.challenges = new Map(); // userId -> { challenge, expiresAt }
    this.emailOtps = new Map();  // email -> { code, expiresAt }
    this.pins = new Map();       // userId/email -> hashedPin
    this.thresholds = new Map(); // userId/email -> customBigAmountThreshold (default ₹2000)
    this.failedAttempts = new Map(); // userId/email -> count of consecutive failed attempts
    this.lockedAccounts = new Map(); // email/userId -> { blockedUntil, reason, lockedAt, token }
    this.transactions = [];

    // Seed default administrative/test user
    this.seedDefaults();
  }

  seedDefaults() {
    const defaultUser = {
      id: 'usr_biovault_01',
      email: 'alex.vance@biovault.ai',
      fullName: 'Alex Vance',
      role: 'Principal Financial Officer',
      trustTier: 'Tier-4 Biometric Verified',
      accountBalance: 148520.50,
      createdAt: new Date()
    };
    this.users.set(defaultUser.id, defaultUser);
    this.users.set(defaultUser.email, defaultUser);

    // Default threshold ₹2,000 INR
    this.setThreshold(defaultUser.id, 2000);
    this.setThreshold(defaultUser.email, 2000);

    // Initial benign transactions
    this.transactions.push(
      {
        id: 'tx_101',
        userId: defaultUser.id,
        amount: 450.00,
        merchant: 'Vault Reserve Cafe',
        timestamp: new Date(Date.now() - 3600000 * 2),
        reconstructionError: 0.08,
        status: 'Approved (Low Risk)'
      },
      {
        id: 'tx_102',
        userId: defaultUser.id,
        amount: 1800.00,
        merchant: 'Cloud Services API',
        timestamp: new Date(Date.now() - 3600000 * 24),
        reconstructionError: 0.12,
        status: 'Approved (Low Risk)'
      }
    );

    // Default demo PIN '1234' for seeded user
    this.setPin(defaultUser.id, '1234');
    this.setPin(defaultUser.email, '1234');
  }

  getThreshold(userIdOrEmail) {
    if (!userIdOrEmail) return 2000;
    if (this.thresholds.has(userIdOrEmail)) return this.thresholds.get(userIdOrEmail);
    if (typeof userIdOrEmail === 'string' && this.thresholds.has(userIdOrEmail.toLowerCase())) {
      return this.thresholds.get(userIdOrEmail.toLowerCase());
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      if (this.thresholds.has(user.id)) return this.thresholds.get(user.id);
      if (user.email && this.thresholds.has(user.email.toLowerCase())) {
        return this.thresholds.get(user.email.toLowerCase());
      }
    }
    return 2000;
  }

  setThreshold(userIdOrEmail, amount) {
    const val = Number(amount) > 0 ? Number(amount) : 2000;
    this.thresholds.set(userIdOrEmail, val);
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      this.thresholds.set(userIdOrEmail.toLowerCase(), val);
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.thresholds.set(user.id, val);
      if (user.email) this.thresholds.set(user.email.toLowerCase(), val);
    }
    return val;
  }

  recordFailedAttempt(userIdOrEmail) {
    if (!userIdOrEmail) return 1;
    const current = this.getFailedAttempts(userIdOrEmail);
    const updated = current + 1;
    this.failedAttempts.set(userIdOrEmail, updated);
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      this.failedAttempts.set(userIdOrEmail.toLowerCase(), updated);
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.failedAttempts.set(user.id, updated);
      if (user.email) this.failedAttempts.set(user.email.toLowerCase(), updated);
    }
    return updated;
  }

  getFailedAttempts(userIdOrEmail) {
    if (!userIdOrEmail) return 0;
    if (this.failedAttempts.has(userIdOrEmail)) return this.failedAttempts.get(userIdOrEmail);
    if (typeof userIdOrEmail === 'string' && this.failedAttempts.has(userIdOrEmail.toLowerCase())) {
      return this.failedAttempts.get(userIdOrEmail.toLowerCase());
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      if (this.failedAttempts.has(user.id)) return this.failedAttempts.get(user.id);
      if (user.email && this.failedAttempts.has(user.email.toLowerCase())) {
        return this.failedAttempts.get(user.email.toLowerCase());
      }
    }
    return 0;
  }

  resetFailedAttempts(userIdOrEmail) {
    if (!userIdOrEmail) return;
    this.failedAttempts.delete(userIdOrEmail);
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      this.failedAttempts.delete(userIdOrEmail.toLowerCase());
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.failedAttempts.delete(user.id);
      if (user.email) this.failedAttempts.delete(user.email.toLowerCase());
    }
  }

  // Account Lockout Protocol (5-Hour Lock triggered upon confirming unauthorized access)
  createLockToken(userIdOrEmail) {
    const key = (userIdOrEmail || '').toLowerCase().trim();
    const token = crypto.randomBytes(24).toString('hex');
    const existing = this.lockedAccounts.get(key) || {};
    this.lockedAccounts.set(key, { ...existing, token, tokenExpiresAt: Date.now() + 24 * 3600 * 1000 });
    return token;
  }

  lockAccount(userIdOrEmail, hours = 5, reason = 'Unauthorized Biometric Face Access Attempt Confirmed by Account Holder') {
    if (!userIdOrEmail) return null;
    const cleanKey = String(userIdOrEmail).toLowerCase().trim();
    const now = Date.now();
    const blockedUntil = new Date(now + hours * 3600 * 1000);
    const lockRecord = {
      isLocked: true,
      lockedAt: new Date(now),
      blockedUntil,
      remainingHours: hours,
      reason
    };

    this.lockedAccounts.set(cleanKey, lockRecord);
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.lockedAccounts.set(user.id, lockRecord);
      if (user.email) this.lockedAccounts.set(user.email.toLowerCase().trim(), lockRecord);
    }
    return lockRecord;
  }

  isAccountLocked(userIdOrEmail) {
    if (!userIdOrEmail) return { isLocked: false };
    const cleanKey = String(userIdOrEmail).toLowerCase().trim();
    let record = this.lockedAccounts.get(cleanKey);
    if (!record) {
      const user = this.getUser(userIdOrEmail);
      if (user) {
        record = this.lockedAccounts.get(user.id) || (user.email ? this.lockedAccounts.get(user.email.toLowerCase().trim()) : null);
      }
    }

    if (!record || !record.isLocked) return { isLocked: false };

    const now = Date.now();
    const expireTime = new Date(record.blockedUntil).getTime();
    if (now >= expireTime) {
      // 5 hours have passed - automatically unlock!
      this.unlockAccount(userIdOrEmail);
      return { isLocked: false, wasUnlocked: true };
    }

    const remainingMs = expireTime - now;
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    const remainingHours = (remainingMs / (3600 * 1000)).toFixed(1);

    return {
      isLocked: true,
      remainingMs,
      remainingMinutes,
      remainingHours,
      blockedUntil: record.blockedUntil,
      lockedAt: record.lockedAt,
      reason: record.reason
    };
  }

  unlockAccount(userIdOrEmail) {
    if (!userIdOrEmail) return;
    const cleanKey = String(userIdOrEmail).toLowerCase().trim();
    this.lockedAccounts.delete(cleanKey);
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.lockedAccounts.delete(user.id);
      if (user.email) this.lockedAccounts.delete(user.email.toLowerCase().trim());
    }
  }

  resetAll() {
    this.users.clear();
    this.biometrics.clear();
    this.passkeys.clear();
    this.challenges.clear();
    this.emailOtps.clear();
    this.pins.clear();
    this.thresholds.clear();
    this.failedAttempts.clear();
    this.lockedAccounts.clear();
    this.transactions = [];
    this.seedDefaults();
    return true;
  }

  resetBiometricDescriptor(userId) {
    this.biometrics.delete(userId);
    return true;
  }

  getUser(idOrEmail) {
    return this.users.get(idOrEmail) || null;
  }

  saveUser(user) {
    if (!user.id) user.id = `usr_${crypto.randomBytes(6).toString('hex')}`;
    this.users.set(user.id, user);
    this.users.set(user.email, user);
    return user;
  }

  saveBiometricDescriptor(userIdOrEmail, descriptorVector) {
    const now = new Date();
    // 180-Day (6 months) Security Lock Policy
    const lockExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const record = {
      userId: userIdOrEmail,
      descriptor: descriptorVector,
      dimension: descriptorVector.length,
      registeredAt: now,
      lockExpiresAt,
      isLocked: true
    };
    this.biometrics.set(userIdOrEmail, record);
    this.biometrics.set('usr_biovault_01', record);
    this.lastRegisteredDescriptor = record;
    if (typeof userIdOrEmail === 'string' && userIdOrEmail.includes('@')) {
      this.biometrics.set(userIdOrEmail.toLowerCase(), record);
    }
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.biometrics.set(user.id, record);
      if (user.email) this.biometrics.set(user.email.toLowerCase(), record);
    }
    return record;
  }

  getBiometricDescriptor(userIdOrEmail) {
    if (!userIdOrEmail) return this.biometrics.get('usr_biovault_01') || this.lastRegisteredDescriptor || null;
    let rec = this.biometrics.get(userIdOrEmail);
    if (!rec && typeof userIdOrEmail === 'string') {
      rec = this.biometrics.get(userIdOrEmail.toLowerCase());
    }
    if (!rec) {
      const user = this.getUser(userIdOrEmail);
      if (user) {
        rec = this.biometrics.get(user.id) || (user.email ? this.biometrics.get(user.email.toLowerCase()) : null);
      }
    }
    return rec || this.biometrics.get('usr_biovault_01') || this.lastRegisteredDescriptor || null;
  }

  setChallenge(userId, challenge) {
    this.challenges.set(userId, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    });
  }

  setEmailOtp(email, code) {
    if (!email || !code) return;
    this.emailOtps.set(email.trim().toLowerCase(), {
      code: String(code).trim(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes
    });
  }

  verifyEmailOtp(email, code) {
    if (!email || !code) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    const record = this.emailOtps.get(cleanEmail);
    if (!record) return false;
    if (Date.now() > record.expiresAt) {
      this.emailOtps.delete(cleanEmail);
      return false;
    }
    return record.code === cleanCode;
  }

  // Security Transaction PIN Hashing & Verification
  hashPin(pin) {
    return crypto.createHash('sha256').update(String(pin).trim() + '_biovault_secure_salt').digest('hex');
  }

  setPin(userIdOrEmail, pin) {
    if (!userIdOrEmail || !pin) return false;
    const hash = this.hashPin(pin);
    this.pins.set(userIdOrEmail, hash);
    const user = this.getUser(userIdOrEmail);
    if (user) {
      this.pins.set(user.id, hash);
      if (user.email) this.pins.set(user.email.toLowerCase(), hash);
    }
    return true;
  }

  verifyPin(userIdOrEmail, pin) {
    if (!pin) return false;
    const enteredHash = this.hashPin(pin);
    let storedHash = this.pins.get(userIdOrEmail);
    if (!storedHash && userIdOrEmail) {
      storedHash = this.pins.get(userIdOrEmail.toLowerCase());
    }
    if (!storedHash) {
      const user = this.getUser(userIdOrEmail);
      if (user) {
        storedHash = this.pins.get(user.id) || this.pins.get(user.email?.toLowerCase());
      }
    }
    // Fallback default demo PIN if no explicit PIN set yet
    if (!storedHash) {
      return enteredHash === this.hashPin('1234');
    }
    return storedHash === enteredHash;
  }

  hasPin(userIdOrEmail) {
    if (!userIdOrEmail) return false;
    if (this.pins.has(userIdOrEmail) || this.pins.has(userIdOrEmail.toLowerCase())) return true;
    const user = this.getUser(userIdOrEmail);
    if (user) {
      return this.pins.has(user.id) || (user.email && this.pins.has(user.email.toLowerCase()));
    }
    return false;
  }

  getChallenge(userId) {
    const record = this.challenges.get(userId);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.challenges.delete(userId);
      return null;
    }
    return record.challenge;
  }

  savePasskey(userId, passkeyData) {
    const list = this.passkeys.get(userId) || [];
    list.push(passkeyData);
    this.passkeys.set(userId, list);
    return list;
  }

  getPasskeys(userId) {
    return this.passkeys.get(userId) || [];
  }

  addTransaction(tx) {
    if (!tx.id) tx.id = `tx_${Date.now()}`;
    tx.timestamp = new Date();
    this.transactions.unshift(tx);
    return tx;
  }

  getTransactions(userId) {
    return this.transactions.filter(t => !userId || t.userId === userId);
  }
}

const store = new BioVaultStore();
module.exports = store;
