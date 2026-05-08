const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { 
        type: String, 
        required: true, 
        enum: ['breakfast', 'lunch', 'snacks', 'dinner'] 
    }
}, { timestamps: true });

// Prevent duplicate items in the same category
foodItemSchema.index({ name: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('FoodItem', foodItemSchema);
