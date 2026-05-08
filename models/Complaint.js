const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hosteler',
        required: true
    },
    studentName: { type: String, required: true },
    rollNo: { type: String },
    roomNo: { type: String },
    college: { type: String },
    hostelId: { type: String },
    year: { type: String },
    complaintText: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Issue Solved', 'Issue Recognized', 'Issue Canceled'],
        default: 'Pending'
    },
    resolvedBy: { type: String },
    resolvedDate: { type: Date }
}, { timestamps: true });

complaintSchema.index({ hostelId: 1, status: 1 });
complaintSchema.index({ rollNo: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
