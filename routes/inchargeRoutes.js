const express = require('express');
const router = express.Router();
const inchargeController = require('../controllers/inchargeController');
const authenticateUser = require('../middleware/auth')
// CRUD operations for incharges
router.post('/create',authenticateUser , inchargeController.createIncharge); //Adding new Incharge 
router.get('/verify/:eid',inchargeController.verifyIncharge)//verify incharge in forgot password
router.get('/getAll', inchargeController.getAllIncharges); //Getting all Incharges
router.get('/getIncharges/:hostelId',inchargeController.getInchargesByHostelId); //Getting Incharges by hostelID
router.get('/:eid',authenticateUser, inchargeController.getInchargeByEid); //get Incharge Details by empId
router.put('/update/:eid',authenticateUser , inchargeController.updateInchargeByEid); //update incharge details
router.delete('/delete/:eid', authenticateUser ,inchargeController.deleteInchargeByEid); //delete incharge details

module.exports = router;
