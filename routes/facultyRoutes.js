// routes/facultyRoutes.js
const express = require("express");
const router = express.Router();
const FacultyController = require('../controllers/FacultyController')
const authenticateUser = require("../middleware/auth");


router.post("/add",authenticateUser , FacultyController.createFaculty);
router.get("/get",authenticateUser , FacultyController.getFaculty);
router.put("/update", authenticateUser, FacultyController.updateFaculty);
router.post("/login",FacultyController.login)

module.exports = router;
