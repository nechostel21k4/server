const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateUser, isFaculty } = require("../middleware/auth");

router.get('/stats', authenticateUser, isFaculty, dashboardController.getStats);

module.exports = router;
