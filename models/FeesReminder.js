// models/FeesReminder.js
const mongoose = require('mongoose');

const FeesReminderSchema = new mongoose.Schema(
  {
    sendBy: { type: String, required: true },
    college: { type: String, required: true },
    year: { type: String, required: true }, 
    feeAmountNonAC: { type: String, required: true },
    feeAmountAC: { type: String, required: true },
    feeAmount: { type: String }, // For convenience/summary
    message: { type: String, required: true },
    msgCount: { type: Number, default: 0 },
    submittedTime: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeesReminder", FeesReminderSchema);
