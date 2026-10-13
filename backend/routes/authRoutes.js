const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/email/send-code', authController.sendEmailOtp);
router.post('/email/verify-code', authController.verifyEmailOtp);

router.post('/pin/register', authController.registerPin);
router.post('/pin/verify', authController.verifyPin);

router.post('/facecard/register', authController.registerFacecard);
router.post('/facecard/verify', authController.verifyFacecard);
router.post('/facecard/reset', authController.resetFacecard);
router.post('/reset-all', authController.resetAll);

router.post('/webauthn/register-challenge', authController.getWebAuthnRegisterChallenge);
router.post('/webauthn/register-verify', authController.verifyWebAuthnRegistration);

router.get('/confirm-unauthorized', authController.confirmUnauthorizedAccess);
router.post('/confirm-unauthorized', authController.confirmUnauthorizedAccess);
router.get('/lock-status', authController.getLockStatus);
router.post('/unlock-account', authController.unlockAccount);

router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
