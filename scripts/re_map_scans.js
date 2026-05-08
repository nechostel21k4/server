const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Hosteler = require('../models/Hostelers');
const MealConsumption = require('../models/MealConsumption');
const HostlerCredentials = require('../models/HostlerCredentials');

async function reMapScans() {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to MongoDB');

        const scans = await MealConsumption.find({}).lean();
        console.log(`Processing ${scans.length} scans...`);

        for (const scan of scans) {
            // Find student. Note: scan.studentId might be Credentials ID OR Hosteler ID
            let student = await Hosteler.findById(scan.studentId).lean();
            
            if (!student) {
                // Try finding by credentials ID if it was mis-mapped
                const creds = await HostlerCredentials.findById(scan.studentId).lean();
                if (creds) {
                    student = await Hosteler.findOne({ rollNo: creds.rollNo }).lean();
                }
            }

            if (student) {
                await MealConsumption.updateOne(
                    { _id: scan._id },
                    { 
                        $set: { 
                            studentId: student._id,
                            hostelId: student.hostelId || 'Main',
                            college: student.college || 'HostelX'
                        } 
                    }
                );
            }
        }

        console.log('Re-mapping complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

reMapScans();
