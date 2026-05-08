const express = require("express");
const router = express.Router();
const logsController = require("../controllers/logsController");
const { authenticateUser, isAdmin } = require('../middleware/auth')

router.post("/add-log", authenticateUser, logsController.addLog); 
router.post("/getLogs", authenticateUser, isAdmin, logsController.getLogsByDate); 
router.delete("/delete-logs", authenticateUser, isAdmin, logsController.deleteOldLogs);

module.exports = router;
