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

    // Initial benign transactions
    this.transactions.push(
      {
        id: 'tx_101',
        userId: defaultUser.id,
        amount: 45.20,
        merchant: 'Vault Reserve Cafe',
        timestamp: new Date(Date.now() - 3600000 * 2),
        reconstructionError: 0.08,
        status: 'Approved (Low Risk)'
      },
      {
        id: 'tx_102',
        userId: defaultUser.id,
        amount: 180.00,
        merchant: 'Cloud Services API',
        timestamp: new Date(Date.now() - 3600000 * 24),
        reconstructionError: 0.12,
        status: 'Approved (Low Risk)'
      }
    );
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

  saveBiometricDescriptor(userId, descriptorVector) {
    const now = new Date();
    // 180-Day (6 months) Security Lock Policy
    const lockExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const record = {
      userId,
      descriptor: descriptorVector,
      dimension: descriptorVector.length,
      registeredAt: now,
      lockExpiresAt,
      isLocked: true
    };
    this.biometrics.set(userId, record);
    return record;
  }

  getBiometricDescriptor(userId) {
    return this.biometrics.get(userId) || null;
  }

  setChallenge(userId, challenge) {
    this.challenges.set(userId, {
      challenge,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes validity
    });
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
