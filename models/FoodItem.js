const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { 
        type: String, 
        required: true, 
        enum: ['breakfast', 'lunch', 'snacks', 'dinner'] 
    },
    hostelId: {
        type: String,
        default: 'all'
    }
}, { timestamps: true });

// Prevent duplicate items in the same category for the same hostel
foodItemSchema.index({ name: 1, category: 1, hostelId: 1 }, { unique: true });

module.exports = mongoose.model('FoodItem', foodItemSchema);
