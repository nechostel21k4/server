// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateUser = require("../middleware/auth");

router.post("/add-admin", authenticateUser, adminController.createAdmin); // add admin details 
router.get('/getadmin/:eid', authenticateUser, adminController.getAdminByUsername);//get admin data after login
router.put('/update/:username', authenticateUser, adminController.updateAdminByUsername); //update admin details by username
router.delete('/delete/:username', authenticateUser, adminController.deleteAdminByUsername); //delete admin details by username
router.get('/verify/:eid', adminController.verifyAdmin) // verify admin in forgot password
router.get("/getAdmins", authenticateUser, adminController.getAllAdmins);
// router.post('/login',adminController.login); //admin Login


module.exports = router;