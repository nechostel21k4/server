const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MealConsumption = require('../models/MealConsumption');

async function fixData() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        // Update all records where hostelId is 'N/A' or missing
        const resHostel = await MealConsumption.updateMany(
            { 
                $or: [
                    { hostelId: 'N/A' },
                    { hostelId: null },
                    { hostelId: { $exists: false } }
                ]
            },
            { $set: { hostelId: 'Main' } }
        );

        // Update all records where college is 'N/A' or missing
        const resCollege = await MealConsumption.updateMany(
            { 
                $or: [
                    { college: 'N/A' },
                    { college: null },
                    { college: { $exists: false } }
                ]
            },
            { $set: { college: 'HostelX' } }
        );

        console.log(`Updated ${resHostel.modifiedCount} hostelId records and ${resCollege.modifiedCount} college records.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixData();
