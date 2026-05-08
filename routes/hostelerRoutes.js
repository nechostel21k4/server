const express = require('express');
const router = express.Router();
const hostelerController = require('../controllers/hostelerController');
const transliterationController = require('../controllers/transliterationController');
const { authenticateUser, isAdmin, isFaculty } = require("../middleware/auth");
const { otpLimiter } = require('../middleware/rateLimiter');
const { studentValidation } = require('../middleware/validator');

router.post('/create', authenticateUser, isAdmin, studentValidation, hostelerController.createHosteler); 
router.get('/verify/:RollNo', otpLimiter, hostelerController.verifyStudent) 
router.get('/register/:RollNo', hostelerController.verifyRegisterStudent) 
router.get('/search/:key', authenticateUser, isFaculty, hostelerController.searchHosteler); 
router.get('/suggestions/:key', authenticateUser, isFaculty, hostelerController.getStudentSuggestions); 
router.get('/:RollNo', authenticateUser, hostelerController.getHostelerByRollNo);
router.post('/getAll', authenticateUser, isFaculty, hostelerController.getFilteredHostlers);

router.put('/update/:RollNo', authenticateUser, isFaculty, hostelerController.updateHostelerByRollNo);
router.put('/updateMany', authenticateUser, isAdmin, hostelerController.updateFilteredHostlers) 

router.delete('/delete/:RollNo', authenticateUser, isAdmin, hostelerController.deleteHostelerByRollNo); 
router.delete("/deleteMany", authenticateUser, isAdmin, hostelerController.deleteFilteredHostlers); 

router.get('/get/counts/:hostelId', authenticateUser, isFaculty, hostelerController.getHostelerCountsByHostelId); 
router.get('/get/countsByClg/:hostelId', authenticateUser, isFaculty, hostelerController.getHostelerCountsByCollege); 

router.post('/roomno', authenticateUser, isFaculty, hostelerController.getHostelersByRoomNo)
router.post("/getRoomies", authenticateUser, hostelerController.getMyRoomies)
router.post('/createRequestAndUpdate/:RollNo', authenticateUser, hostelerController.createRequestAndUpdateStudent);

router.put('/updateTransliteration/bulk', authenticateUser, isAdmin, transliterationController.bulkUpdateStudentNames);
router.put('/updateTransliteration/:id', authenticateUser, isAdmin, transliterationController.updateStudentName);

module.exports = router;
