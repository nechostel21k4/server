const mongoose = require('mongoose');

const marqueeSchema = new mongoose.Schema({
    text: { type: String, required: true, default: "Welcome to Hostel Portal" },
    isEnabled: { type: Boolean, default: true },
    lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Marquee', marqueeSchema);
