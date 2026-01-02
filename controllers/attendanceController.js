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
        const file = req.file; // Face image

        if (!studentId || !latitude || !longitude || !file) {
            return res.status(400).json({ message: "Missing fields (studentId, lat, lng, image)" });
        }

        // Fetch Student to get Hostel ID
        const student = await Hosteler.findOne({ rollNo: studentId });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        const hostelId = student.hostelId; // Assuming field name is hostelId or similar (schema says hostelId)

        // 1. Check Previous Attendance Today
        // 1. Check Previous Attendance Today
        // Ensure we check based on Indian Standard Time (IST) if deployment is cloud/UTC
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // Format: YYYY-MM-DD

        const existing = await Attendance.findOne({ studentId, date: today });
        if (existing) {
            console.log(`[Attendance] Duplicate Blocked: ${studentId} already present on ${today}`);
            return res.status(400).json({ message: "Attendance already marked for today." });
        }

        // 2. Validate IP Address (Network-Based Attendance) - REMOVED per user request

        // Fetch hostel configuration
        const hostel = await Hostel.findOne({ code: hostelId });
        let targetHostel = hostel;

        if (!targetHostel) {
            console.log("Warning: Hostel not found in database.");
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

        // 3. Geofence Check (Non-blocking: Marks as Absent if outside)
        let isWithinGeofence = false;
        let distance = 0;
        let attendanceStatus = 'Present'; // Default
        let attendanceRemarks = "Within geofence";

        if (targetHostel.geoCoordinates && targetHostel.geoCoordinates.latitude) {
            distance = getDistanceFromLatLonInM(
                latitude, longitude,
                targetHostel.geoCoordinates.latitude, targetHostel.geoCoordinates.longitude
            );

            // Round to 2 decimal places
            distance = Math.round(distance * 100) / 100;
            const maxRadius = targetHostel.geoCoordinates.radius || 200;

            console.log(`[Attendance] Distance: ${distance}m (Max: ${maxRadius}m)`);

            if (distance <= maxRadius) {
                isWithinGeofence = true;
                attendanceStatus = 'Present';
                attendanceRemarks = "Within geofence";
            } else {
                isWithinGeofence = false;
                attendanceStatus = 'Absent';
                attendanceRemarks = `Outside geofence (${distance}m > ${maxRadius}m)`;
                console.log(`[Attendance] Location Mis-match: Marking as ABSENT.`);
            }
        } else {
            // Fallback if no geofence set
            isWithinGeofence = true;
            attendanceRemarks = "No geofence configured";
        }

        // 3. Verify Face
        const studentCreds = await HostlerCredentials.findOne({ rollNo: studentId });

        // DEBUG LOGGING
        console.log(`[Attendance] Verifying for ${studentId}`);
        console.log(`[Attendance] Creds found: ${!!studentCreds}`);
        if (studentCreds) {
            console.log(`[Attendance] Descriptor type: ${typeof studentCreds.faceDescriptor}, IsArray: ${Array.isArray(studentCreds.faceDescriptor)}`);
            console.log(`[Attendance] Descriptor length: ${studentCreds.faceDescriptor ? studentCreds.faceDescriptor.length : 'NULL'}`);
        }

        // Strict Check: Ensure descriptor is an array and has length (Float32Array usually has 128 elements)
        if (!studentCreds || !studentCreds.faceDescriptor || studentCreds.faceDescriptor.length < 100) {
            console.log(`[Attendance] Blocked: Face not registered.`);
            return res.status(400).json({ message: "Face not registered. Please register your face first." });
        }

        let matchResult;

        // OPTIMIZATION: Check if client sent the descriptor directly
        if (req.body.faceDescriptor) {
            console.log("[Attendance] Using client-provided descriptor");
            try {
                const clientDescriptor = JSON.parse(req.body.faceDescriptor);
                // Convert to Float32Array or array depending on what FaceService expects (isFaceMatch handles both usually, but let's be safe)
                // FaceAPI descriptors are Float32Array. 
                // clientDescriptor from JSON will be a regular array. FaceService.isFaceMatch uses faceapi.euclideanDistance which works with arrays.

                matchResult = FaceService.isFaceMatch(studentCreds.faceDescriptor, clientDescriptor);
            } catch (e) {
                console.error("[Attendance] Invalid client descriptor:", e);
                return res.status(400).json({ message: "Invalid face descriptor format." });
            }
        } else {
            // Fallback: Compute on server (Slow)
            console.log("[Attendance] improved server-side descriptor calculation");
            const uploadedDescriptor = await FaceService.getFaceDescriptor(file.buffer);
            if (!uploadedDescriptor) {
                return res.status(400).json({ message: "No face detected in the image." });
            }
            matchResult = FaceService.isFaceMatch(studentCreds.faceDescriptor, uploadedDescriptor);
        }

        console.log(`[Attendance] Match Result: ${JSON.stringify(matchResult)}`);

        if (!matchResult.isMatch) {
            return res.status(403).json({ message: "Face verification failed. Unauthorized." });
        }

        // 4. Save Attendance


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
        console.error(error);
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

        let descriptor;

        // OPTIMIZATION: Check if client sent the descriptor
        if (req.body.faceDescriptor) {
            console.log("[Register] Using client-provided descriptor");
            try {
                // Parse if stringified
                const parsed = typeof req.body.faceDescriptor === 'string'
                    ? JSON.parse(req.body.faceDescriptor)
                    : req.body.faceDescriptor;

                descriptor = new Float32Array(parsed); // Ensure Float32Array
            } catch (e) {
                console.error("[Register] Invalid client descriptor:", e);
                return res.status(400).json({ message: "Invalid face descriptor format." });
            }
        } else {
            // Fallback: Compute on server (Slow)
            console.log("[Register] Performing server-side detection...");
            descriptor = await FaceService.getFaceDescriptor(file.buffer);
            if (!descriptor) {
                return res.status(400).json({ message: "No face detected. Try again." });
            }
        }

        // Convert Float32Array to regular array for Mongo
        const descriptorArray = Array.from(descriptor);

        // Update Credentials
        // Note: For 10 images, the frontend should probably send them one by one or as a batch.
        // Here we handle single upload. If batch is needed, we'd accept `req.files`.
        // Let's assume we update with the BEST single image for now to keep it simple, 
        // OR the user calls this API multiple times?
        // Better: frontend selects best image or sends one verified image. 
        // We will store this one.

        await HostlerCredentials.findOneAndUpdate(
            { rollNo },
            {
                $set: { faceDescriptor: descriptorArray }
            },
            { upsert: true } // Create if not exists? No, student must be in DB.
        );

        res.status(200).json({ message: "Face registered successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Registration failed", error: error.message });
    }
}

exports.getAttendanceHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const history = await Attendance.find({ studentId }).sort({ date: -1 });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getDailyAttendance = async (req, res) => {
    try {
        const { date, hostelId } = req.query; // Expecting YYYY-MM-DD
        let query = {};
        if (date) query.date = date;
        if (hostelId) query.hostelId = hostelId;

        const records = await Attendance.find(query).sort({ time: 1 });

        // Get unique studentIds (RollNos)
        const rollNos = [...new Set(records.map(r => r.studentId))];

        // Fetch names for these roll numbers
        const students = await Hosteler.find({ rollNo: { $in: rollNos } }, 'rollNo name');
        const nameMap = {};
        students.forEach(s => { nameMap[s.rollNo] = s.name; });

        // Merge name into records
        // Note: record is a Mongoose document. use .toObject() or ._doc spread to add fields if strict.
        const recordsWithName = records.map(r => ({
            ...r.toObject(),
            name: nameMap[r.studentId] || 'Unknown'
        }));

        res.status(200).json(recordsWithName);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getRegistrationStatus = async (req, res) => {
    try {
        // Get all students and check if they have a faceDescriptor in Credentials
        // This requires joining Hosteler (Profile) and HostlerCredentials (Auth/Face)
        // Since they are separate models linked by rollNo:

        const students = await Hosteler.find({}); // Add filtering by hostelId if needed
        const credentials = await HostlerCredentials.find({}); // Get all creds

        // Map creds for quick lookup
        const credMap = {};
        credentials.forEach(c => {
            credMap[c.rollNo] = (c.faceDescriptor && c.faceDescriptor.length > 0);
        });

        const statusList = students.map(s => ({
            rollNo: s.rollNo,
            name: s.name,
            hostelId: s.hostelId,
            isRegistered: !!credMap[s.rollNo]
        }));

        res.status(200).json(statusList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

exports.getDailyLeaves = async (req, res) => {
    try {
        const { date, hostelId } = req.query; // YYYY-MM-DD
        if (!date) return res.status(400).json({ message: "Date is required" });

        // Construct start and end of the target day
        // Assuming date is in local time representation "YYYY-MM-DD"
        // We create a range that covers that whole day.
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const query = {
            status: 'ACCEPTED',
            isActive: true,
            $or: [
                {
                    type: 'LEAVE',
                    fromDate: { $lte: endOfDay }
                },
                {
                    type: 'PERMISSION',
                    date: { $lte: endOfDay }
                }
            ]
        };

        if (hostelId && hostelId !== 'BOTH') {
            query.hostelId = hostelId;
        }

        const leaves = await Request.find(query);
        res.status(200).json(leaves);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
