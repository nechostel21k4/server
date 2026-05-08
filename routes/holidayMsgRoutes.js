const express = require("express");
const router = express.Router();
const holidayMsgController = require("../controllers/HolidayMsgController");
const { authenticateUser, isAdmin } = require("../middleware/auth");

// Routes for CRUD operations
router.post("/create", authenticateUser, isAdmin, holidayMsgController.createHolidayMsg);
router.get("/all", authenticateUser, holidayMsgController.getHolidayMsgs);
router.delete("/delete/:id", authenticateUser, isAdmin, holidayMsgController.deleteHolidayMsg);

// Route to send holiday messages
router.post("/send", authenticateUser, isAdmin, holidayMsgController.sendHolidayMsgs);

module.exports = router;
