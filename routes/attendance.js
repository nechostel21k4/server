const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const multer = require('multer');

// Configure Multer for memory storage (fast usage for face api)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/mark', upload.single('image'), attendanceController.markAttendance);
router.post('/register-face', upload.single('image'), attendanceController.registerFace);
router.get('/history/:studentId', attendanceController.getAttendanceHistory);
router.get('/daily', attendanceController.getDailyAttendance);
router.get('/registration-status', attendanceController.getRegistrationStatus);
router.get('/daily-leaves', attendanceController.getDailyLeaves);
router.get('/upcoming-leaves', attendanceController.getUpcomingLeaves);

module.exports = router;
