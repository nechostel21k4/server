const express = require('express');
const router = express.Router();
const adminLoginController = require('../controllers/adminLoginController');
const authenticateUser = require("../middleware/auth");

// Create a new admin
// router.post('/create', adminLoginController.createAdmin); //add admin  credentials
// Delete an admin by username
router.delete('/:username',authenticateUser, adminLoginController.deleteAdmin);
// Admin login
router.post('/login', adminLoginController.login); // admin login 
// Forgot password
router.post('/forgot-password', adminLoginController.forgotPassword);
//verify otp
router.post("/verifyOTP",adminLoginController.verifyOtp);
// Update an admin by username
router.put("/update-password", adminLoginController.updateAdminPassword);




module.exports = router;

 // Get all admins
// router.get('/getAll', adminLoginController.getAllAdmins);