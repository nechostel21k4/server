const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateUser, isAdmin } = require("../middleware/auth");
const { otpLimiter } = require('../middleware/rateLimiter');

router.post("/add-admin", authenticateUser, isAdmin, adminController.createAdmin); 
router.get('/getadmin/:eid', authenticateUser, isAdmin, adminController.getAdminByUsername);
router.put('/update/:username', authenticateUser, isAdmin, adminController.updateAdminByUsername); 
router.delete('/delete/:username', authenticateUser, isAdmin, adminController.deleteAdminByUsername); 
router.get('/verify/:eid', otpLimiter, adminController.verifyAdmin) 
router.get("/getAdmins", authenticateUser, isAdmin, adminController.getAllAdmins);

module.exports = router;