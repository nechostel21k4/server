const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authenticateUser = require('../middleware/auth');

router.post('/create', authenticateUser, complaintController.createComplaint);
router.get('/all', authenticateUser, complaintController.getComplaints);
router.get('/room', authenticateUser, complaintController.getRoomComplaints);
router.put('/update/:id', authenticateUser, complaintController.updateComplaintStatus);
router.delete('/delete/:id', authenticateUser, complaintController.deleteComplaint);


module.exports = router;
