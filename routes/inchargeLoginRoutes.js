const express = require('express');
const router = express.Router();
const inchargeLoginController = require('../controllers/inchargeLoginController');
const { authenticateUser, isAdmin } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Create a new incharge (admin only)
router.post('/create', authenticateUser, isAdmin, inchargeLoginController.createInchargeLogin); 

// Incharge login
router.post('/login', loginLimiter, inchargeLoginController.login);
router.post('/verifyOTP', otpLimiter, inchargeLoginController.verifyOtp);

// update password
router.put("/update-password", inchargeLoginController.updateInchargePassword);

module.exports = router;
