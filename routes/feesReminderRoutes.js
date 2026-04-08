const express = require("express");
const router = express.Router();
const feesReminderController = require("../controllers/feesReminderController");

// Route to send and log fee reminders
router.post("/send", feesReminderController.sendFeesReminders);

// Route to get fee reminders for a student's year
router.get("/student/:year", feesReminderController.getFeesRemindersForStudent);

// Route to get all previous fee reminders history
router.get("/all", feesReminderController.getFeesReminders);

module.exports = router;
