const mongoose = require('mongoose');
require('dotenv').config();

const Attendance = require('./models/Attendance');

async function check() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URL);
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb+srv://moturisireesha:Omsaisneha21@cluster0.i12tj.mongodb.net/hostel_attendence?appName=Cluster0');
        console.log("Connected to DB.");

        const attendances = await Attendance.find().sort({ createdAt: -1 }).limit(10);
        console.log("Recent attendances:", attendances.map(a => ({
            studentId: a.studentId,
            date: a.date,
            time: a.time,
            createdAt: a.createdAt
        })));
        
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

check();
