const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');

// Registration
router.post('/register/generate-options', biometricController.generateRegistrationOptions);
router.post('/register/verify', biometricController.verifyRegistration);

// Authentication
router.post('/login/generate-options', biometricController.generateAuthenticationOptions);
router.post('/login/verify', biometricController.verifyAuthentication);

module.exports = router;
