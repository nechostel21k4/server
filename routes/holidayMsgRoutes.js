const express = require("express");
const router = express.Router();
const holidayMsgController = require("../controllers/HolidayMsgController");
const authenticateUser = require("../middleware/auth");

// Routes for CRUD operations
router.post("/create", authenticateUser, holidayMsgController.createHolidayMsg);
router.get("/all", holidayMsgController.getHolidayMsgs);
router.delete("/delete/:id", holidayMsgController.deleteHolidayMsg);

// Route to send holiday messages
router.post("/send",authenticateUser, holidayMsgController.sendHolidayMsgs);

module.exports = router;
