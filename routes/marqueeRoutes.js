const express = require('express');
const router = express.Router();
const marqueeController = require('../controllers/marqueeController');

router.get('/', marqueeController.getMarquee);
router.post('/update', marqueeController.updateMarquee);

module.exports = router;
