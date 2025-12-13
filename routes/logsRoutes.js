const express = require("express");
const router = express.Router();
const logsController = require("../controllers/logsController");
const authenticateUser = require('../middleware/auth')
// Route to add a new log
router.post("/add-log",authenticateUser , logsController.addLog); //add the log 

// Route to get logs by date (date format: YYYY-MM-DD)
router.post("/getLogs",authenticateUser , logsController.getLogsByDate); // get logs based on selected date
router.delete("/delete-logs",authenticateUser ,logsController.deleteOldLogs)


module.exports = router;
