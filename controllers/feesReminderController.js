const FeesReminder = require("../models/FeesReminder");
const Hosteler = require("../models/Hostelers");
const sendSMS = require("../utils/sendSMS");
const dotenv = require("dotenv");
dotenv.config();

const FEES_TEMPLATE_ID = process.env.FEES_TEMPLATE_ID;
const FEES_MSG_TEMPLATE = process.env.FEES_MSG_TEMPLATE;

// Create a new fee reminder (log only)
exports.createFeesReminder = async (req, res) => {
  try {
    const feesReminder = new FeesReminder(req.body);
    await feesReminder.save();
    res.status(201).json({
      success: true,
      message: "Fee reminder logged successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all fee reminders history
exports.getFeesReminders = async (req, res) => {
  try {
    const messages = await FeesReminder.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send and log fee reminders
exports.sendFeesReminders = async (req, res) => {
  try {
    const { college, year, feeAmountNonAC, feeAmountAC, sendBy, message } = req.body;

    const allColleges = ["NEC", "NIT", "NIPS"];
    const collegesToProcess = (!college || college === "ALL") ? allColleges : [college];

    let totalMessagesSent = 0;

    for (const currentCollege of collegesToProcess) {
      const filter = { college: currentCollege };
      if (year !== "ALL") {
        filter.year = year;
      }

      // Find students for the current filter
      const students = await Hosteler.find(filter);
      if (!students || students.length === 0) {
        continue;
      }

      // Send SMS to parents per student to handle gender-specific word
      for (const student of students) {
        const genderWord = student.gender?.toUpperCase() === "MALE" ? "మీ అబ్బాయి" : "మీ అమ్మాయి";
        
        // Variables: {var1}=Year, {var2}=Non-AC, {var3}=GenderWord, {var4}=AC
        const variables = [year === "ALL" ? "ALL" : `${year} Year`, feeAmountNonAC, genderWord, feeAmountAC];

        const smsResult = await sendSMS(
          student.parentPhoneNo,
          FEES_TEMPLATE_ID,
          FEES_MSG_TEMPLATE,
          variables
        );

        if (smsResult.success) {
          totalMessagesSent++;
        }
      }
    }

    // Log the transaction
    try {
      const logEntry = new FeesReminder({
        college,
        year,
        feeAmountNonAC,
        feeAmountAC,
        feeAmount: `Non-AC: ${feeAmountNonAC}, AC: ${feeAmountAC}`,
        sendBy,
        msgCount: totalMessagesSent,
        message: message
      });
      await logEntry.save();
    } catch (err) {
      console.error("Error logging fee reminder:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Fees reminders processed successfully.",
      totalMessagesSent,
    });
  } catch (error) {
    console.error("Error sending fee reminders:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFeesRemindersForStudent = async (req, res) => {
  try {
    const { year } = req.params;
    // Check for both the specific year and "ALL" notifications
    const messages = await FeesReminder.find({
      year: { $in: [year.toString(), "ALL"] }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
