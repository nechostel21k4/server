const express = require('express');
const router = express.Router();
const hostlerCredentialsController = require('../controllers/hostlerCredentialsController');
const { authenticateUser, isAdmin, isStudent } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Create a new hostler (admin only)
router.post('/create', authenticateUser, isAdmin, hostlerCredentialsController.createHostler);

// Update student details and credentials (registration) — requires valid student token
router.post('/register-student', hostlerCredentialsController.updateHostelerAndCredentials);

// Hostler login — rate limited
router.post('/login', loginLimiter, hostlerCredentialsController.login);

// Update password (student only, uses OTP reset token)
router.put('/update-password', hostlerCredentialsController.updateHostlerPassword);

// Verify OTP — rate limited to prevent brute force
router.post('/verifyOTP', otpLimiter, hostlerCredentialsController.verifyOtp);

module.exports = router;
