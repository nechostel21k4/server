const HolidayMsg = require("../models/HolidayMsg");
const Hosteler = require("../models/Hostelers");
const sendSMS = require("../utils/sendSMS");
const dotenv = require("dotenv");
const axios = require("axios");
const { transliterateName } = require("../utils/transliterationUtils");
dotenv.config();

const HOLIDAY_TEMPLATE_ID = process.env.HOLIDAY_TEMPLATE_ID;
const HOLIDAY_MSG_TEMPLATE = process.env.HOLIDAY_MSG_TEMPLATE;

// Create a new holiday message
exports.createHolidayMsg = async (req, res) => {
  try {
    const holidayMsg = new HolidayMsg(req.body);
    await holidayMsg.save();
    res.status(201).json({
      success: true,
      message: "Holiday message created successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all holiday messages
exports.getHolidayMsgs = async (req, res) => {
  try {
    const messages = await HolidayMsg.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a holiday message by ID
exports.deleteHolidayMsg = async (req, res) => {
  try {
    const message = await HolidayMsg.findByIdAndDelete(req.params.id);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Holiday message not found." });
    }
    res.status(200).json({
      success: true,
      message: "Holiday message deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send holiday messages to parents
exports.sendHolidayMsgs = async (req, res) => {
  try {
    console.log("Processing holiday messages...");
    const { college, year, occasion, fromDate, toDate, sendBy, message } = req.body;

    const allColleges = ["NEC", "NIT", "NIPS"];

    const collegesToProcess = college === "ALL" ? allColleges : [college];

    let totalMessagesSent = 0; // Track total messages sent

    for (const currentCollege of collegesToProcess) {
      const filter = { college: currentCollege };
      if (year !== "ALL") {
        filter.year = year;
      }

      // Find students for the current college
      const students = await Hosteler.find(filter);
      if (!students || students.length === 0) {
        console.log(`No students found for college: ${currentCollege}`);
        continue; // Skip to the next college
      }

      // Get the phone numbers of parents
      const parentPhoneNumbers = students.map(
        (student) => student.parentPhoneNo
      );
      // const parentPhoneNumbers=['8790066998']
      const messageTemplate = HOLIDAY_MSG_TEMPLATE;

      // Translate the occasion to Telugu
      const occasionTel = await transliterateName(occasion);

      // Variables for the SMS
      const variables = [currentCollege, occasionTel, fromDate, toDate];
      console.log(`Sending SMS for college: ${currentCollege}`);
      console.log("Variables:", variables);
      console.log("Parent Phone Numbers:", parentPhoneNumbers);

      // Send SMS to parents of the current college
      for (const phoneNumber of parentPhoneNumbers) {
        const smsResult = await sendSMS(
          phoneNumber,
          HOLIDAY_TEMPLATE_ID,
          messageTemplate,
          variables
        );
        if (smsResult.success) {
          totalMessagesSent++;
        } else {
          console.error(
            `Failed to send SMS to ${phoneNumber} for college ${currentCollege}:`,
            smsResult.error
          );
        }
      }

      console.log(`Messages sent for college: ${currentCollege}`);
    }

    try {
      const holidayMsg = new HolidayMsg({
        college: college,
        Year: year,
        occasion: occasion,
        sendBy: sendBy,
        fromDate: fromDate,
        toDate: toDate,
        msgCount: totalMessagesSent,
        message: message
      });
      await holidayMsg.save();
    } catch (err) {
      console.log("Error : while adding holiday msg to holidayMsg Schema", err);
    }

    res.status(200).json({
      success: true,
      message: "Holiday messages processed successfully.",
      totalMessagesSent,
    });
  } catch (error) {
    console.error("Error sending holiday messages:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
