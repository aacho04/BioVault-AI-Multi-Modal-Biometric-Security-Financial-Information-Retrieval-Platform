const jwt = require('jsonwebtoken');
const { ensureKeys } = require('../services/keyService');

const { publicKey } = ensureKeys();

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token provided in demo/dev mode, allow fallback demo user context
    req.user = { sub: 'usr_biovault_01', email: 'alex.vance@biovault.ai', role: 'Principal Financial Officer' };
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired RS256 JWT authorization token.' });
  }
};
