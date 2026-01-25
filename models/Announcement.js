const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String, // Cloudinary URL
    },
    date: {
        type: Date,
        default: Date.now
    },
    hostelId: {
        type: String, // Optional: e.g., 'BH1', 'GH1'. If null/empty, visible to all (or logic defined in controller)
    },
    type: {
        type: String,
        enum: ['ADMIN', 'INCHARGE'],
        default: 'ADMIN'
    },
    author: {
        type: String, // Name or ID of the creator
    }
});

module.exports = mongoose.model('Announcement', announcementSchema);
