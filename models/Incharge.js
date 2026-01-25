// models/Admin.js
const mongoose = require('mongoose');

const inchargeSchema = new mongoose.Schema({
    hostelId: { type: String, required: true },
    name: { type: String, required: true },
    phoneNo: { type: String, required: true },
    eid: { type: String, required: true, unique: true },
    designation:String,
}, { timestamps: true });

module.exports = mongoose.model('Incharge', inchargeSchema);
