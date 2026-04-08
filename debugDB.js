const mongoose = require('mongoose');
const Hosteler = require('./models/Hostelers');
const Attendance = require('./models/Attendance');
const { Hostel } = require('./models/CollegeBranchHostelSchema');

// Connect to DB
const connectDB = async () => {
    try {
        const url = "mongodb+srv://moturisireesha:Omsaisneha21@cluster0.i12tj.mongodb.net/hostel_attendence?appName=Cluster0";
        await mongoose.connect(url, {
            useNewUrlParser: true, useUnifiedTopology: true
        });
        console.log("MongoDB connected");
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

const runDebug = async () => {
    await connectDB();

    console.log("--- Unique Hostel IDs in Hostelers Collection ---");
    const students = await Hosteler.find({}, 'hostelId name');
    const studentHostels = [...new Set(students.map(s => s.hostelId))];
    console.log("Student Hostel IDs:", studentHostels);
    if (students.length > 0) console.log("Sample Student:", students[0]);

    console.log("\n--- Unique Hostel IDs in Attendance Collection ---");
    const attendance = await Attendance.find({}, 'hostelId');
    const attendanceHostels = [...new Set(attendance.map(a => a.hostelId))];
    console.log("Attendance Hostel IDs:", attendanceHostels);

    console.log("\n--- Hostels in Hostel Schema ---");
    const hostels = await Hostel.find({});
    console.log(JSON.stringify(hostels, null, 2));

    process.exit(0);
};

runDebug();
