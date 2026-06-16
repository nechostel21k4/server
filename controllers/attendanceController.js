const Attendance = require('../models/Attendance');
const Hosteler = require('../models/Hostelers');
const HostlerCredentials = require('../models/HostlerCredentials');
const { Hostel } = require('../models/CollegeBranchHostelSchema'); // Import Hostel model
const Request = require('../models/Requests');
const FaceService = require('../utils/FaceService');

// Helper to calculate distance between two coords (Haversine formula)
const getDistanceFromLatLonInM = (lat1, lon1, lat2, lon2) => {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Distance in meters
}

const deg2rad = (deg) => {
    return deg * (Math.PI / 180)
}

exports.markAttendance = async (req, res) => {
    try {
        const { studentId, latitude, longitude } = req.body;
        const file = req.file;

        if (!studentId || !latitude || !longitude || !file) {
            return res.status(400).json({ message: "Missing fields (studentId, lat, lng, image)" });
        }

        // ✅ SECURITY: Cross-validate studentId against JWT — prevent marking attendance for others
        if (req.user.rollNo !== studentId) {
            return res.status(403).json({ message: "Forbidden: You can only mark your own attendance." });
        }

        const student = await Hosteler.findOne({ rollNo: studentId }).lean();
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const hostelId = student.hostelId;

        // 1. Check Previous Attendance Today
        // 1. Check Previous Attendance Today
        // Ensure we check based on Indian Standard Time (IST) if deployment is cloud/UTC
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Format: YYYY-MM-DD

        const existing = await Attendance.findOne({ studentId, date: today });
        if (existing) {
            return res.status(400).json({ message: "Attendance already marked for today." });
        }

        // 2. Validate IP Address (Network-Based Attendance) - REMOVED per user request

        // Fetch hostel configuration
        const hostel = await Hostel.findOne({ code: hostelId });
        let targetHostel = hostel;

        if (!targetHostel) {
            return res.status(404).json({ message: "Hostel configuration not found." });
        }

        // 2.5 Time Restriction Check
        if (targetHostel.attendanceStartTime && targetHostel.attendanceEndTime) {
            const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            const currentDate = new Date(nowIST);

            const [startH, startM] = targetHostel.attendanceStartTime.split(':');
            const startTime = new Date(currentDate);
            startTime.setHours(parseInt(startH), parseInt(startM), 0, 0);

            const [endH, endM] = targetHostel.attendanceEndTime.split(':');
            const endTime = new Date(currentDate);
            endTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

            if (currentDate < startTime || currentDate > endTime) {
                return res.status(403).json({
                    message: `Attendance Closed. Time: ${targetHostel.attendanceStartTime} - ${targetHostel.attendanceEndTime}`
                });
            }
        }

        // 3. Geofence Check (STRICT ENFORCEMENT)
        let distance = 0;
        let attendanceStatus = 'Present'; 
        let attendanceRemarks = "Within geofence";

        if (targetHostel.geoCoordinates && targetHostel.geoCoordinates.latitude) {
            distance = getDistanceFromLatLonInM(
                latitude, longitude,
                targetHostel.geoCoordinates.latitude, targetHostel.geoCoordinates.longitude
            );

            // Round to 2 decimal places
            distance = Math.round(distance * 100) / 100;
            const maxRadius = targetHostel.geoCoordinates.radius || 200;

            if (distance > maxRadius) {
                return res.status(403).json({ 
                    success: false,
                    message: `Attendance Rejected: You are outside the allowed radius (${distance}m > ${maxRadius}m). Please mark attendance from within the hostel premises.` 
                });
            }
        } else {
            attendanceRemarks = "No geofence configured";
        }

        // 4. Verify Face (STRICT SERVER-SIDE COMPUTATION)
        const studentCreds = await HostlerCredentials.findOne({ rollNo: studentId });

        if (!studentCreds || !studentCreds.faceDescriptor || studentCreds.faceDescriptor.length < 100) {
            return res.status(400).json({ message: "Face not registered. Please register your face first." });
        }

        // SECURITY: Never trust a descriptor sent from the client.
        // An attacker could "replay" a known-good descriptor string.
        // We always re-compute it from the uploaded image buffer.
        const uploadedDescriptor = await FaceService.getFaceDescriptor(file.buffer);
        if (!uploadedDescriptor) {
            return res.status(400).json({ message: "No face detected in the image. Please take a clear photo." });
        }

        const matchResult = FaceService.isFaceMatch(studentCreds.faceDescriptor, uploadedDescriptor);

        if (!matchResult.isMatch) {
            return res.status(403).json({ message: "Face verification failed. Please try again with a clear photo." });
        }

        // 4. Save Attendance


        const isWithinGeofence = true;

        const newAttendance = new Attendance({
            studentId,
            hostelId,
            date: today,
            time: new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false }),
            location: { latitude, longitude },


            // Face Data
            matchScore: matchResult.distance,
            faceVerified: true,
            faceConfidence: matchResult.distance, // Using distance as confidence proxy (lower is better usually, but storing raw value)

            // Geofence Data
            isWithinGeofence,
            distance,
            remarks: attendanceRemarks,

            status: attendanceStatus
        });

        await newAttendance.save();
        res.status(200).json({
            message: "Attendance marked successfully!",
            data: newAttendance,
            studentName: student.name // Return name for UI
        });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

exports.registerFace = async (req, res) => {
    try {
        const { rollNo } = req.body;
        const file = req.file;

        if (!file || !rollNo) {
            return res.status(400).json({ message: "Image and RollNo required." });
        }

        // ✅ SECURITY: Students can only register their own face
        if (req.user.rollNo !== rollNo) {
            return res.status(403).json({ message: "Forbidden: You can only register your own face." });
        }

        // Verify student exists before registering face
        const studentExists = await HostlerCredentials.findOne({ rollNo }).lean();
        if (!studentExists) {
            return res.status(404).json({ message: "Student account not found. Contact admin." });
        }

        // ✅ SECURITY: Always compute descriptor on server to prevent descriptor-injection attacks
        const descriptor = await FaceService.getFaceDescriptor(file.buffer);
        if (!descriptor) {
            return res.status(400).json({ message: "No face detected. Please provide a clear facial photo." });
        }

        // Convert Float32Array to regular array for Mongo
        const descriptorArray = Array.from(descriptor);

        await HostlerCredentials.findOneAndUpdate(
            { rollNo },
            {
                $set: { faceDescriptor: descriptorArray }
            },
            { upsert: true }
        );

        res.status(200).json({ message: "Face registered successfully." });

    } catch (error) {
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
}

exports.getAttendanceHistory = async (req, res) => {
    try {
        const { studentId } = req.params;

        // ✅ SECURITY: Students can only view their own history
        if (req.user.role === 'student' && req.user.rollNo !== studentId) {
            return res.status(403).json({ success: false, message: "Forbidden: You can only view your own attendance history." });
        }

        const history = await Attendance.find({ studentId }).sort({ date: -1 });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getDailyAttendance = async (req, res) => {
    try {
        const { date, hostelId } = req.query; // Expecting YYYY-MM-DD
        let matchQuery = {};
        if (date) matchQuery.date = date;
        if (hostelId && hostelId !== 'BOTH' && hostelId !== 'ALL') matchQuery.hostelId = hostelId;

        // Use aggregation to join name from Hosteler collection for better performance
        const records = await Attendance.aggregate([
            { $match: matchQuery },
            { $sort: { time: 1 } },
            {
                $lookup: {
                    from: 'hostelers',
                    localField: 'studentId',
                    foreignField: 'rollNo',
                    as: 'studentInfo'
                }
            },
            {
                $project: {
                    studentId: 1,
                    hostelId: 1,
                    date: 1,
                    time: 1,
                    status: 1,
                    isWithinGeofence: 1,
                    distance: 1,
                    remarks: 1,
                    name: { $ifNull: [{ $arrayElemAt: ['$studentInfo.name', 0] }, 'Unknown'] }
                }
            }
        ]);

        res.status(200).json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getRegistrationStatus = async (req, res) => {
    try {
        const { hostelId } = req.query;
        let matchQuery = {};
        if (hostelId && hostelId !== 'BOTH' && hostelId !== 'ALL') {
            matchQuery.hostelId = hostelId;
        }

        // ⚡ Perform server-side join using aggregation
        // This avoids loading thousands of documents into Node.js memory
        const statusList = await Hosteler.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: 'hostlercredentials',
                    localField: 'rollNo',
                    foreignField: 'rollNo',
                    as: 'creds'
                }
            },
            {
                $project: {
                    rollNo: 1,
                    name: 1,
                    hostelId: 1,
                    isRegistered: {
                        $cond: {
                            if: { 
                                $and: [
                                    { $gt: [{ $size: '$creds' }, 0] },
                                    { $gt: [{ $size: { $ifNull: [{ $arrayElemAt: ['$creds.faceDescriptor', 0] }, []] } }, 0] }
                                ]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            { $sort: { rollNo: 1 } }
        ]);

        res.status(200).json(statusList);
    } catch (error) {
        console.error("Registration Status Error:", error);
        res.status(500).json({ error: error.message });
    }
}

exports.getDailyLeaves = async (req, res) => {
    try {
        const { date, hostelId } = req.query; // YYYY-MM-DD
        if (!date) return res.status(400).json({ message: "Date is required" });

        // Construct start and end of the target day
        // We force IST (UTC+05:30) interpretation since the institution is in India.
        // This ensures that "2026-01-14" covers 00:00 to 23:59 IST,
        // which corresponds to 18:30 (prev day) to 18:29 UTC.
        const startOfDay = new Date(`${date}T00:00:00+05:30`);
        const endOfDay = new Date(`${date}T23:59:59.999+05:30`);

        const query = {
            status: { $in: ["ACCEPTED", "ARRIVED"] },
            $or: [
                {
                    type: { $regex: /^LEAVE$/i },
                    "accepted.time": { $lte: endOfDay },
                    $or: [
                        { "arrived.time": { $gt: startOfDay } },
                        { "arrived.time": { $exists: false } }
                    ]
                },
                {
                    type: { $regex: /^PERMISSION$/i },
                    date: { $gte: startOfDay, $lte: endOfDay }
                }
            ]
        };

        if (hostelId && hostelId !== 'BOTH' && hostelId !== 'ALL') {
            query.hostelId = hostelId;
        }

        const leaves = await Request.find(query);
        res.status(200).json(leaves);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getUpcomingLeaves = async (req, res) => {
    try {
        const { date, hostelId } = req.query; // YYYY-MM-DD
        if (!date) return res.status(400).json({ message: "Date is required" });

        // End of Today (IST)
        const endOfDay = new Date(`${date}T23:59:59.999+05:30`);

        const query = {
            status: 'ACCEPTED',
            type: 'LEAVE',
            fromDate: { $gt: endOfDay } // Strictly future leaves
        };

        if (hostelId && hostelId !== 'BOTH') {
            query.hostelId = hostelId;
        }

        // Limit to reasonable future (e.g. next 30 days) or just all? 
        // Let's get all for now, frontend can filter or valid.
        // Actually, maybe just next 1 month is enough to avoid fetching next year's leave.
        // But for "Absent" check, any future leave is interesting.
        const leaves = await Request.find(query).sort({ fromDate: 1 });
        res.status(200).json(leaves);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
