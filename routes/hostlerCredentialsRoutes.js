const express = require('express');
const router = express.Router();
const hostlerCredentialsController = require('../controllers/hostlerCredentialsController');

// Create a new hostler
router.post('/create', hostlerCredentialsController.createHostler);// create student credentials
router.post('/register-student',hostlerCredentialsController.updateHostelerAndCredentials) //updating the student details and student credentials

// Hostler login
router.post('/login', hostlerCredentialsController.login); // student login
// update password
router.put('/update-password', hostlerCredentialsController.updateHostlerPassword); //update the student password

router.post('/verifyOTP',hostlerCredentialsController.verifyOtp) //verify the otp entered by studnet




module.exports = router;
