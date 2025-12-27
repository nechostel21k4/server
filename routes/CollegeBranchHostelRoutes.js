const express = require("express");
const router = express.Router();
const schemaController = require('../controllers/CollegeBranchHostelController')
const authenticateUser = require("../middleware/auth");


router.get("/getColleges", authenticateUser, schemaController.getAllColleges)
router.get("/addGetColleges", authenticateUser, schemaController.AddandGetColleges)

router.post("/updateCollegeById/:id", authenticateUser, schemaController.updateCollegeById)
router.delete("/deleteCollegeById/:id", authenticateUser, schemaController.deleteCollegeById)


router.get("/getBranches", authenticateUser, schemaController.getAllBranches)
router.get("/addGetBranches", authenticateUser, schemaController.AddandGetBranches)

router.post("/updateBranchById/:id", authenticateUser, schemaController.updateBranchById)
router.delete("/deleteBranchById/:id", authenticateUser, schemaController.deleteBranchById)

router.get("/getHostels", authenticateUser, schemaController.getAllHostels)
router.get("/addGetHostels", authenticateUser, schemaController.AddandGetHostels)

router.post("/updateHostelById/:id", authenticateUser, schemaController.updateHostelById)
router.delete("/deleteHostelById/:id", authenticateUser, schemaController.deleteHostelById)

// Hostel IP Configuration
router.post("/updateHostelIPs", authenticateUser, schemaController.updateHostelIPs)

module.exports = router;
