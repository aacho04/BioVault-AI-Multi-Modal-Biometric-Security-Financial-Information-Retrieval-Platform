const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/facecard/register', authController.registerFacecard);
router.post('/facecard/verify', authController.verifyFacecard);

router.post('/webauthn/register-challenge', authController.getWebAuthnRegisterChallenge);
router.post('/webauthn/register-verify', authController.verifyWebAuthnRegistration);

router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
