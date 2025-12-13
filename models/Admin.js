// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNo: { type: String, required: true },
    eid: { type: String, required: true, unique: true },
    designation:String,

    
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);
