// models/Hostel.js
const mongoose = require('mongoose');

const hostelersSchema = new mongoose.Schema({
   hostelId: String,
   rollNo: { type: String, required: true, unique: true },
   name: String,
   nameTelugu: String,
   college: String,
   year: Number,
   branch: String,
   gender: String,
   // dob:{ type: Date},
   phoneNo: { type: String, required: true },
   email: String,
   parentName: String,
   roomNo: String,
   parentPhoneNo: { type: String, required: true },
   currentStatus: { type: String, default: "HOSTEL" }, // enum:[“hostel”,”permission”,”leave”],
   requestCount: { type: Number, default: 0 },
   lastRequest: {}

}, { timestamps: true });

// Performance Optimization: Indexes for frequently filtered fields
hostelersSchema.index({ hostelId: 1, college: 1, year: 1, branch: 1 });
hostelersSchema.index({ rollNo: 1 }, { unique: true });
hostelersSchema.index({ name: 'text' }); // Text index for better search
hostelersSchema.index({ currentStatus: 1 });

module.exports = mongoose.model('Hosteler', hostelersSchema);
