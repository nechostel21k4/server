const mongoose = require('mongoose');
const { Hostel } = require('./models/CollegeBranchHostelSchema');
const Hosteler = require('./models/Hostelers');
require('dotenv').config({ path: './.env' });

async function checkHostelConfig() {
    try {
        const uri = process.env.MONGODB_URL;
        if (!uri) throw new Error("MONGODB_URL not found");

        await mongoose.connect(uri);
        console.log('Connected to DB');

        // 1. Get all Hostels
        const hostels = await Hostel.find({});
        const hostelCodes = new Set(hostels.map(h => h.code));

        console.log(`Found ${hostels.length} hostels:`, Array.from(hostelCodes));

        // 2. Get all Students
        const students = await Hosteler.find({}, 'rollNo hostelId name');
        console.log(`Found ${students.length} students.`);

        // 3. Check consistency
        let invalidCount = 0;
        students.forEach(s => {
            if (!s.hostelId) {
                console.log(`WARNING: Student ${s.rollNo} (${s.name}) has NO hostelId. (Is this expected?)`);
                invalidCount++;
            } else if (!hostelCodes.has(s.hostelId)) {
                console.log(`ERROR: Student ${s.rollNo} (${s.name}) has INVALID hostelId: '${s.hostelId}'. Config not found.`);
                invalidCount++;
            }
        });

        if (invalidCount === 0) {
            console.log("SUCCESS: All student hostelIds match existing Hostel configurations.");
        } else {
            console.log(`Found ${invalidCount} students with configuration issues.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkHostelConfig();
