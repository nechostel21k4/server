const Hosteler = require('../models/Hostelers');
const Attendance = require('../models/Attendance');
const Request = require('../models/Requests');

exports.getStats = async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const now = new Date();
        const HOSTEL_IDS = ['BH1', 'GH1'];

        // ⚡ All queries use server-side aggregation — no full collection scans in Node.js memory
        const [studentCounts, attendanceCounts, leaveCounts] = await Promise.all([
            // Count students grouped by hostelId (index hit on hostelId field)
            Hosteler.aggregate([
                { $match: { hostelId: { $in: HOSTEL_IDS } } },
                { $group: { _id: '$hostelId', total: { $sum: 1 } } }
            ]),
            // Count today's attendance grouped by hostelId
            Attendance.aggregate([
                { $match: { date: today, hostelId: { $in: HOSTEL_IDS } } },
                { $group: { _id: '$hostelId', present: { $sum: 1 } } }
            ]),
            // Count active accepted requests grouped by hostelId + type
            Request.aggregate([
                {
                    $match: {
                        hostelId: { $in: HOSTEL_IDS },
                        status: 'ACCEPTED',
                        isActive: true,
                        $or: [
                            { fromDate: { $lte: now }, toDate: { $gte: now } },
                            { fromTime: { $lte: now }, toTime: { $gte: now } }
                        ]
                    }
                },
                { $group: { _id: { hostelId: '$hostelId', type: '$type' }, count: { $sum: 1 } } }
            ])
        ]);

        // Build fast lookup maps
        const studentMap = {};
        studentCounts.forEach(({ _id, total }) => { studentMap[_id] = total; });

        const attendanceMap = {};
        attendanceCounts.forEach(({ _id, present }) => { attendanceMap[_id] = present; });

        const leaveMap = {}; // leaveMap[hostelId][type] = count
        leaveCounts.forEach(({ _id, count }) => {
            if (!leaveMap[_id.hostelId]) leaveMap[_id.hostelId] = {};
            leaveMap[_id.hostelId][_id.type] = count;
        });

        const getHostelStats = (hostelId) => {
            const totalStudents = studentMap[hostelId] || 0;
            const present = attendanceMap[hostelId] || 0;
            const leave = leaveMap[hostelId]?.['LEAVE'] || 0;
            const pendingLeaves = leaveMap[hostelId]?.['PERMISSION'] || 0;
            const absent = Math.max(0, totalStudents - present - leave);
            return { totalStudents, present, absent, leave, pendingLeaves };
        };

        res.status(200).json({
            hostels: {
                BH1: { stats: getHostelStats('BH1') },
                GH1: { stats: getHostelStats('GH1') }
            },
            lastSync: new Date().toISOString()
        });
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
