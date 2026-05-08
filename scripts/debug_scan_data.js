const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Hosteler = require('../models/Hostelers');
const MealConsumption = require('../models/MealConsumption');

async function debugData() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        const lastScan = await MealConsumption.findOne().sort({ createdAt: -1 }).lean();
        console.log('Last Scan Record:', JSON.stringify(lastScan, null, 2));

        if (lastScan) {
            // Find the credentials record for the studentId saved in the scan
            // (Remember, if it was saved before my latest fix, it's the Credentials ID)
            const HostlerCredentials = require('../models/HostlerCredentials');
            const creds = await HostlerCredentials.findById(lastScan.studentId).lean();
            console.log('Credentials record associated with scan:', creds);

            if (creds) {
                const student = await Hosteler.findOne({ rollNo: creds.rollNo }).lean();
                console.log('Hosteler profile found for this scan:', student);
            } else {
                // Check if it's already a Hosteler ID
                const student = await Hosteler.findById(lastScan.studentId).lean();
                console.log('Direct Hosteler profile lookup:', student);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugData();
