const express = require("express");
const router = express.Router();
const schemaController = require('../controllers/CollegeBranchHostelController')
const { authenticateUser, isAdmin, isFaculty } = require("../middleware/auth");


router.get("/getColleges", authenticateUser, schemaController.getAllColleges)
router.get("/addGetColleges", authenticateUser, isAdmin, schemaController.AddandGetColleges)

router.post("/updateCollegeById/:id", authenticateUser, isAdmin, schemaController.updateCollegeById)
router.delete("/deleteCollegeById/:id", authenticateUser, isAdmin, schemaController.deleteCollegeById)


router.get("/getBranches", authenticateUser, schemaController.getAllBranches)
router.get("/addGetBranches", authenticateUser, isAdmin, schemaController.AddandGetBranches)

router.post("/updateBranchById/:id", authenticateUser, isAdmin, schemaController.updateBranchById)
router.delete("/deleteBranchById/:id", authenticateUser, isAdmin, schemaController.deleteBranchById)

router.get("/getHostels", authenticateUser, schemaController.getAllHostels)
router.get("/addGetHostels", authenticateUser, isAdmin, schemaController.AddandGetHostels)

router.post("/updateHostelById/:id", authenticateUser, isAdmin, schemaController.updateHostelById)
router.delete("/deleteHostelById/:id", authenticateUser, isAdmin, schemaController.deleteHostelById)
router.get("/getHostel/:code", authenticateUser, schemaController.getHostelByCode)

// Hostel IP Configuration
router.post("/updateHostelIPs", authenticateUser, isAdmin, schemaController.updateHostelIPs)
// Hostel Settings Configuration (Time)
router.post("/updateHostelSettings", authenticateUser, isAdmin, schemaController.updateHostelSettings)

module.exports = router;
