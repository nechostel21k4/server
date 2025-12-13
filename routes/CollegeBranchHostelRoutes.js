const express = require("express");
const router = express.Router();
const schemaController = require('../controllers/CollegeBranchHostelController')
const authenticateUser = require("../middleware/auth");


router.get("/getColleges",authenticateUser,schemaController.getAllColleges)
router.get("/addGetColleges",authenticateUser,schemaController.AddandGetColleges)

router.post("/updateCollegeById/:id",authenticateUser,schemaController.updateCollegeById)
router.delete("/deleteCollegeById/:id",authenticateUser,schemaController.deleteCollegeById)


router.get("/getBranches",authenticateUser,schemaController.getAllBranches)
router.get("/addGetBranches",authenticateUser,schemaController.AddandGetBranches)

router.post("/updateBranchById/:id",authenticateUser,schemaController.updateBranchById)
router.delete("/deleteBranchById/:id",authenticateUser,schemaController.deleteBranchById)

module.exports = router;
