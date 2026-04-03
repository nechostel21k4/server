// models/HolidayMsg.js
const mongoose = require('mongoose');
const {formatDate} = require("../utils/formatDate")

const HolidayMsgSchema = new mongoose.Schema(
  {
    occasion: { type: String, required: true },
    sendBy: { type: String, required: true },
    college: { type: String, required: true },
    Year: { type: String, required: true }, // Ensure correct case
    fromDate: { type: String,required:true },
    toDate: { type: String,required:true },
    submittedTime: { type: Date, default: Date.now },
    msgCount:Number,
    message:{type:String,required:true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("HolidayMsg", HolidayMsgSchema);
