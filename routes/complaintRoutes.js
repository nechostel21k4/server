const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticateUser, isFaculty, isAdmin } = require('../middleware/auth');

router.post('/create', authenticateUser, complaintController.createComplaint);
router.get('/all', authenticateUser, isFaculty, complaintController.getComplaints);
router.get('/room', authenticateUser, complaintController.getRoomComplaints);
router.put('/update/:id', authenticateUser, isFaculty, complaintController.updateComplaintStatus);
router.delete('/delete/:id', authenticateUser, isFaculty, complaintController.deleteComplaint);

module.exports = router;
