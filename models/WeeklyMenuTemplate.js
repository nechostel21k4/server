const mongoose = require('mongoose');

const weeklyMenuTemplateSchema = new mongoose.Schema({
    dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    mealType: {
        type: String,
        enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
        required: true
    },
    foodName: {
        type: String,
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    hostelId: {
        type: String,
        default: 'all'
    }
}, { timestamps: true });

weeklyMenuTemplateSchema.index({ dayOfWeek: 1, mealType: 1, hostelId: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyMenuTemplate', weeklyMenuTemplateSchema);
