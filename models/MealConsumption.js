const mongoose = require('mongoose');

const mealConsumptionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hosteler',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    dayOfWeek: {
        type: String,
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
    hostelId: String, // Tracks the specific hostel
    college: String,  // Tracks the entity/college name
    scannedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound unique index to prevent duplicate scans for the same meal on the same day
mealConsumptionSchema.index({ studentId: 1, date: 1, mealType: 1 }, { unique: true });

module.exports = mongoose.model('MealConsumption', mealConsumptionSchema);
