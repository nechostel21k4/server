const Hosteler = require('../models/Hostelers');
const Attendance = require('../models/Attendance');
const Request = require('../models/Requests');
const HostlerCredentials = require('../models/HostlerCredentials');

exports.getStats = async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

        // Fetch All Required Data in Parallel for Performance
        const [students, attendance, leaves, credentials] = await Promise.all([
            Hosteler.find({}, 'rollNo name hostelId'),
            Attendance.find({ date: today }, 'studentId hostelId status'),
            Request.find({
                status: 'ACCEPTED',
                $or: [
                    { fromDate: { $lte: new Date() }, toDate: { $gte: new Date() } },
                    { date: today }
                ]
            }),
            HostlerCredentials.find({}, 'rollNo faceDescriptor')
        ]);

        const getHostelStats = (hostelId) => {
            const hStudents = students.filter(s => s.hostelId === hostelId);
            const hAttendance = attendance.filter(a => a.hostelId === hostelId);
            const hLeaves = leaves.filter(l => l.hostelId === hostelId);

            const registeredIds = new Set(hAttendance.map(a => a.studentId));
            const onLeaveIds = new Set(hLeaves.map(l => l.rollNo));

            const totalStudents = hStudents.length;
            const present = hAttendance.length;
            const leave = hLeaves.filter(l => l.type === 'LEAVE').length;
            const pendingLeaves = hLeaves.filter(l => l.type === 'PERMISSION').length; // Map permissions to "pending" or specific bucket

            // Absent = Total - Present - On Leave
            const absent = Math.max(0, totalStudents - present - leave);

            return {
                totalStudents,
                present,
                absent,
                leave,
                pendingLeaves
            };
        };

        const stats = {
            hostels: {
                BH1: { stats: getHostelStats('BH1') },
                GH1: { stats: getHostelStats('GH1') }
            },
            lastSync: new Date().toISOString()
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
