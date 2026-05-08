const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateUser, isFaculty, isAdmin } = require('../middleware/auth');
const multer = require('multer');

// Configure Multer for memory storage (fast usage for face api)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/mark', authenticateUser, upload.single('image'), attendanceController.markAttendance);
router.post('/register-face', authenticateUser, upload.single('image'), attendanceController.registerFace);
router.get('/history/:studentId', authenticateUser, attendanceController.getAttendanceHistory);
router.get('/daily', authenticateUser, isFaculty, attendanceController.getDailyAttendance);
router.get('/registration-status', authenticateUser, isFaculty, attendanceController.getRegistrationStatus);
router.get('/daily-leaves', authenticateUser, isFaculty, attendanceController.getDailyLeaves);
router.get('/upcoming-leaves', authenticateUser, isFaculty, attendanceController.getUpcomingLeaves);

module.exports = router;
