const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticateUser = require("../middleware/auth");

router.get('/stats', authenticateUser, dashboardController.getStats);

module.exports = router;
