const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: String, required: true }, // Roll No
    hostelId: { type: String, required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    time: { type: String, required: true }, // Format: HH:mm:ss
    location: {
        latitude: Number,
        longitude: Number
    },
    ipAddress: { type: String }, // IP Address of the device
    matchScore: { type: Number }, // Face API match confidence
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Leave', 'Permission'],
        default: 'Present'
    }
}, { timestamps: true });

// Compound index to prevent duplicate attendance per day for a student
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
