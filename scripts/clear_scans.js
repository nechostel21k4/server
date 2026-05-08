const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MealConsumption = require('../models/MealConsumption');

async function clearData() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        const result = await MealConsumption.deleteMany({});
        console.log(`Deleted ${result.deletedCount} meal consumption records.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearData();
