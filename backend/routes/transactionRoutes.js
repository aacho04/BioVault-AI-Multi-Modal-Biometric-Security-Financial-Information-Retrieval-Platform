const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/transfer', authMiddleware, transactionController.createTransaction);
router.get('/history', authMiddleware, transactionController.getTransactions);
router.get('/threshold', authMiddleware, transactionController.getThreshold);
router.post('/threshold', authMiddleware, transactionController.updateThreshold);

module.exports = router;
