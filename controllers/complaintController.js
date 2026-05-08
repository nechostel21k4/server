const Complaint = require('../models/Complaint');
const Hosteler = require('../models/Hostelers');
const { ImageModel } = require('../models/ProfileImage');

// Create a new complaint
exports.createComplaint = async (req, res) => {
    try {
        const { studentId, complaintText } = req.body;

        // ✅ SECURITY: Students can only submit complaints for their own profile
        const student = await Hosteler.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        if (req.user.role === 'student' && student.rollNo !== req.user.rollNo) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only submit complaints for your own profile.' });
        }

        const newComplaint = new Complaint({
            studentId,
            studentName: student.name,
            rollNo: student.rollNo,
            roomNo: student.roomNo,
            college: student.college,
            hostelId: student.hostelId,
            year: student.year,
            complaintText
        });

        await newComplaint.save();

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            data: newComplaint
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all complaints (Admin/Incharge) with optimized image join
exports.getComplaints = async (req, res) => {
    try {
        const { college, status, page = 1, limit = 25 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        let matchQuery = {};

        if (college && college !== 'ALL') {
            if (college === 'BH1' || college === 'GH1') {
                matchQuery.hostelId = college;
            } else {
                matchQuery.college = college;
            }
        }
        if (status && status !== 'ALL') {
            matchQuery.status = status;
        }

        // ⚡ Use aggregation for single-trip data fetching with images + pagination
        const [results] = await Complaint.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    metadata: [{ $count: "totalCount" }],
                    data: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limitNum },
                        {
                            $lookup: {
                                from: 'images',
                                localField: 'rollNo',
                                foreignField: 'username',
                                as: 'img'
                            }
                        },
                        {
                            $project: {
                                studentName: 1, rollNo: 1, roomNo: 1, college: 1, 
                                hostelId: 1, year: 1, complaintText: 1, status: 1, 
                                createdAt: 1, resolvedBy: 1, resolvedDate: 1,
                                imagePath: { $arrayElemAt: ['$img', 0] }
                            }
                        }
                    ]
                }
            }
        ]);

        const complaints = results.data || [];
        const totalCount = results.metadata[0]?.totalCount || 0;

        // Map images to absolute URLs
        const imageData = {};
        complaints.forEach(c => {
            if (c.imagePath) {
                const img = c.imagePath;
                imageData[c.rollNo] = img.path && img.path.startsWith('http')
                    ? img.path
                    : `${req.protocol}://${req.get('host')}/uploads/${img.filename}`;
            }
            delete c.imagePath;
        });

        res.status(200).json({
            success: true,
            data: complaints,
            images: imageData,
            totalCount,
            hasMore: totalCount > skip + complaints.length
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get complaints by Room (Student)
exports.getRoomComplaints = async (req, res) => {
    try {
        const { studentId, page = 1, limit = 10 } = req.query;

        const student = await Hosteler.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // ✅ SECURITY: Students can only view their own room complaints
        if (req.user.role === 'student' && req.user.rollNo !== student.rollNo) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const roomies = await Hosteler.find({ 
            hostelId: student.hostelId, 
            roomNo: student.roomNo 
        }).select('_id');
        
        const studentIds = roomies.map(r => r._id);
        const query = { studentId: { $in: studentIds } };

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        const [totalCount, complaints] = await Promise.all([
            Complaint.countDocuments(query),
            Complaint.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
        ]);

        res.status(200).json({
            success: true,
            data: complaints,
            totalCount,
            hasMore: totalCount > skip + complaints.length
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolvedBy } = req.body;

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        complaint.status = status;
        if (status === 'Issue Solved' || status === 'Issue Canceled') {
            if (resolvedBy) complaint.resolvedBy = resolvedBy;
            complaint.resolvedDate = new Date();
        } else {
            // Clear metadata if reopened or moved to pending/recognized
            complaint.resolvedBy = undefined;
            complaint.resolvedDate = undefined;
        }

        await complaint.save();

        res.status(200).json({
            success: true,
            message: 'Complaint status updated',
            data: complaint
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete complaint
exports.deleteComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findByIdAndDelete(id);

        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Complaint deleted successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
