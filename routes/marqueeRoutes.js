const express = require('express');
const router = express.Router();
const marqueeController = require('../controllers/marqueeController');
const { authenticateUser, isAdmin } = require('../middleware/auth');

router.get('/', marqueeController.getMarquee);
router.post('/update', authenticateUser, isAdmin, marqueeController.updateMarquee);

module.exports = router;
