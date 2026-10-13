require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { ensureKeys } = require('./services/keyService');

// Initialize RSA-2048 Cryptographic Core on boot
ensureKeys();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and utility middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Route registration
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const aiProxyRoutes = require('./routes/aiProxyRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api', aiProxyRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'BioVault-AI Enterprise Express 5 Gateway',
    cryptography: 'RS256 RSA-2048 + WebAuthn FIDO2',
    timestamp: new Date().toISOString()
  });
});

// Start Express 5 Gateway
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 BioVault-AI Gateway running on http://localhost:${PORT}`);
  console.log(`🔐 RS256 Asymmetric Cryptography initialized`);
  console.log(`🛡️ 180-Day Biometric Immutability Policy Active`);
  console.log(`=======================================================`);
});
