const FeesReminder = require("../models/FeesReminder");
const Hosteler = require("../models/Hostelers");
const sendFeesSMS = require("../utils/sendFeesSMS");
const dotenv = require("dotenv");
const { College } = require("../models/CollegeBranchHostelSchema");
dotenv.config();

const FEES_TEMPLATE_ID = process.env.FEES_TEMPLATE_ID;
const FEES_MSG_TEMPLATE = process.env.FEES_MSG_TEMPLATE;
const FEES_SAME_TEMPLATE_ID = process.env.FEES_SAME_TEMPLATE_ID;
const FEES_SAME_MSG_TEMPLATE = process.env.FEES_SAME_MSG_TEMPLATE;

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
    const { college, year, feeAmountNonAC, feeAmountAC, sendBy, message, templateType, customYearText } = req.body;

    const allCollegesData = await College.find();
    const allColleges = allCollegesData.map(c => c.code);
    const collegesToProcess = (college.includes("ALL")) ? allColleges : college;

    const filter = { college: { $in: collegesToProcess } };
    if (!year.includes("ALL")) {
      filter.year = { $in: year };
    }

    // ⚡ Use .lean() — no Mongoose document overhead for read-only operation
    const students = await Hosteler.find(filter).lean();

    if (!students || students.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No students found for the selected filters.",
        totalMessagesSent: 0,
      });
    }

    // ⚡ Build all SMS tasks upfront
    const smsTasks = students.map((student) => {
      const genderWord = student.gender?.toUpperCase() === "MALE" ? "మీ అబ్బాయి" : "మీ అమ్మాయి";
      let templateId = FEES_TEMPLATE_ID;
      let templateMsg = FEES_MSG_TEMPLATE;
      let variables = [genderWord, customYearText || "ALL", feeAmountNonAC, feeAmountAC];

      if (templateType === "SAME_AS_LAST_YEAR") {
        templateId = FEES_SAME_TEMPLATE_ID;
        templateMsg = FEES_SAME_MSG_TEMPLATE;
        variables = [genderWord, customYearText || "ALL"];
      }

      return () => sendFeesSMS(student.parentPhoneNo, templateId, templateMsg, variables);
    });

    // ⚡ Send in parallel batches of 20 (respect API rate limits without blocking)
    const BATCH_SIZE = 20;
    let totalMessagesSent = 0;
    let balanceError = null;

    for (let i = 0; i < smsTasks.length; i += BATCH_SIZE) {
      const batch = smsTasks.slice(i, i + BATCH_SIZE).map(fn => fn());
      const results = await Promise.allSettled(batch);

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const smsResult = result.value;
          if (smsResult.success) {
            totalMessagesSent++;
          } else if (smsResult.isBalanceError) {
            balanceError = smsResult.message;
            break; // Stop processing batches on balance error
          }
        } else {
          console.error('[SMS] Task rejected:', result.reason);
        }
      }

      if (balanceError) break;
    }

    if (balanceError) {
      return res.status(200).json({
        success: false,
        message: "SMS API Error: " + balanceError + ". Please top up your credits.",
        totalMessagesSent,
      });
    }

    if (totalMessagesSent === 0) {
      return res.status(200).json({
        success: false,
        message: "No messages sent. Check student filters or SMS balance.",
        totalMessagesSent: 0,
      });
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
        message: message,
        templateType,
        customYearText
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
