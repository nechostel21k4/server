const express = require('express');
const router = express.Router();
const inchargeLoginController = require('../controllers/inchargeLoginController');

// Create a new incharge (admin)
router.post('/create', inchargeLoginController.createInchargeLogin); //create incharge credentials
// Incharge login
router.post('/login', inchargeLoginController.login);//incharge Login
router.post('/verifyOTP',inchargeLoginController.verifyOtp) //verify OTP for incharge

// update password
router.put("/update-password", inchargeLoginController.updateInchargePassword);//update incharge password




module.exports = router;
