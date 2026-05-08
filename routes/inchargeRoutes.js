const express = require('express');
const router = express.Router();
const inchargeController = require('../controllers/inchargeController');
const { authenticateUser, isAdmin, isIncharge } = require('../middleware/auth')
const { otpLimiter } = require('../middleware/rateLimiter');

router.post('/create', authenticateUser, isAdmin, inchargeController.createIncharge); 
router.get('/verify/:eid', otpLimiter, inchargeController.verifyIncharge)
router.get('/getAll', authenticateUser, isAdmin, inchargeController.getAllIncharges); 
router.get('/getIncharges/:hostelId', authenticateUser, inchargeController.getInchargesByHostelId); 
router.get('/:eid', authenticateUser, isIncharge, inchargeController.getInchargeByEid); 
router.put('/update/:eid', authenticateUser, isAdmin, inchargeController.updateInchargeByEid); 
router.delete('/delete/:eid', authenticateUser, isAdmin, inchargeController.deleteInchargeByEid); 

module.exports = router;
