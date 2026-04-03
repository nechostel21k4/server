const mongoose = require('mongoose');
const HostlerCredentials = require('./models/HostlerCredentials');
const Attendance = require('./models/Attendance');
require('dotenv').config({ path: './.env' });

const rollNo = '22471A05M6';

async function checkData() {
    try {
        const uri = process.env.MONGODB_URL;
        if (!uri) throw new Error("MONGODB_URL not found");

        await mongoose.connect(uri);
        console.log('Connected to DB');

        console.log('--- CREDENTIALS ---');
        const creds = await HostlerCredentials.findOne({ rollNo });
        if (creds) {
            console.log(`User: ${creds.rollNo}`);
            console.log(`Face Registered: ${creds.faceDescriptor && creds.faceDescriptor.length > 0}`);
            console.log(`Updated At: ${creds.updatedAt}`);
        } else {
            console.log('User not found in Credentials');
        }

        console.log('\n--- ATTENDANCE RECORDS ---');
        const attendances = await Attendance.find({ studentId: rollNo }).sort({ createdAt: -1 });
        if (attendances.length > 0) {
            attendances.forEach(a => {
                console.log(`Date: ${a.date}, Time: ${a.time}, Status: ${a.status}, CreatedAt: ${a.createdAt}`);
            });
        } else {
            console.log('No attendance records found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
