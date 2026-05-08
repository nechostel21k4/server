const mongoose = require('mongoose');

const mealTimingSchema = new mongoose.Schema({
    mealType: {
        type: String,
        required: true,
        unique: true,
        enum: ['breakfast', 'lunch', 'snacks', 'dinner']
    },
    startTime: {
        type: String, // HH:mm format
        required: true
    },
    endTime: {
        type: String, // HH:mm format
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('MealTiming', mealTimingSchema);
