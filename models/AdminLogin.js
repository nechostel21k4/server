// models/AdminLogin.js
const mongoose = require('mongoose');

const adminLoginSchema = new mongoose.Schema({
    
    eid: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: {type:String}
}, { timestamps: true });

module.exports = mongoose.model('AdminLogin', adminLoginSchema);