const express = require('express');
const router = express.Router();
const adminLoginController = require('../controllers/adminLoginController');
const { authenticateUser, isAdmin } = require("../middleware/auth");
const { loginLimiter, otpLimiter } = require('../middleware/rateLimiter');

// Delete an admin by username
router.delete('/:username', authenticateUser, isAdmin, adminLoginController.deleteAdmin);

// Admin login
router.post('/login', loginLimiter, adminLoginController.login); 

// Forgot password
router.post('/forgot-password', otpLimiter, adminLoginController.forgotPassword);

// Verify OTP
router.post("/verifyOTP", otpLimiter, adminLoginController.verifyOtp);

// Update an admin password
router.put("/update-password", adminLoginController.updateAdminPassword);

module.exports = router;