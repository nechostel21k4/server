const express = require("express");
const router = express.Router();
const feesReminderController = require("../controllers/feesReminderController");
const { authenticateUser, isIncharge, isFaculty } = require("../middleware/auth");

// Route to send and log fee reminders
router.post("/send", authenticateUser, isIncharge, feesReminderController.sendFeesReminders);

// Route to get fee reminders for a student's year
router.get("/student/:year", authenticateUser, feesReminderController.getFeesRemindersForStudent);

// Route to get all previous fee reminders history
router.get("/all", authenticateUser, isFaculty, feesReminderController.getFeesReminders);

module.exports = router;
