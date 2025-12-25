const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const collegeSchema = new Schema({
  code: { type: String, default: "" },
  name: { type: String, default: "" }
});

const branchSchema = new Schema({
  code: { type: String, default: "" },
  name: { type: String, default: "" }
});

const hostelSchema = new Schema({
  code: { type: String, default: "" },
  name: { type: String, default: "" },
  geoCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number, default: 200 } // in meters
  },
  allowedIPs: { type: [String], default: [] } // Array of allowed IP addresses or patterns
});

// Creating models
const College = mongoose.model("College", collegeSchema);
const Branch = mongoose.model("Branch", branchSchema);
const Hostel = mongoose.model("Hostel", hostelSchema);

// Exporting multiple models
module.exports = { College, Branch, Hostel };
