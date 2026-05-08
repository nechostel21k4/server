const express = require("express");
const router = express.Router();
const FacultyController = require('../controllers/FacultyController')
const { authenticateUser, isAdmin, isFaculty } = require("../middleware/auth");

router.post("/add", authenticateUser, isAdmin, FacultyController.createFaculty);
router.get("/get", authenticateUser, isFaculty, FacultyController.getFaculty);
router.put("/update/:id", authenticateUser, isFaculty, FacultyController.updateFaculty);
router.delete("/delete/:id", authenticateUser, isAdmin, FacultyController.deleteFaculty);
router.post("/login", FacultyController.login)

module.exports = router;
