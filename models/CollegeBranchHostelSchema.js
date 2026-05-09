const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const collegeSchema = new Schema({
  code: { type: String, default: "" },
  name: { type: String, default: "" },
  years: { type: Number, default: 4 }
});

const branchSchema = new Schema({
  code: { type: String, default: "" },
  name: { type: String, default: "" }
});

const hostelSchema = new Schema({
  code: { type: String, default: "", unique: true, index: true },
  name: { type: String, default: "" },
  geoCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number, default: 200 }, // in meters
    mapLink: { type: String, default: "" }
  },
  allowedIPs: { type: [String], default: [] }, // Array of allowed IP addresses or patterns
  attendanceStartTime: { type: String, default: "00:00" }, // Format HH:mm
  attendanceEndTime: { type: String, default: "23:59" }   // Format HH:mm
});

// Creating models
const College = mongoose.model("College", collegeSchema);
const Branch = mongoose.model("Branch", branchSchema);
const Hostel = mongoose.model("Hostel", hostelSchema);

// Exporting multiple models
module.exports = { College, Branch, Hostel };
