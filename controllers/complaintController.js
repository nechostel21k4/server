const Complaint = require('../models/Complaint');
const Hosteler = require('../models/Hostelers');

// Create a new complaint
exports.createComplaint = async (req, res) => {
    try {
        const { studentId, complaintText } = req.body;

        const student = await Hosteler.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
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
        console.error('Error creating complaint:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all complaints (Admin/Incharge)
exports.getComplaints = async (req, res) => {
    try {
        const { college, status } = req.query;
        let query = {};

        if (college && college !== 'ALL') {
            query.college = college;
        }
        if (status && status !== 'ALL') {
            query.status = status;
        }

        const complaints = await Complaint.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error('Error fetching complaints:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get complaints by Room (Student)
exports.getRoomComplaints = async (req, res) => {
    try {
        const { studentId } = req.query;

        const student = await Hosteler.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const query = {
            hostelId: student.hostelId,
            roomNo: student.roomNo
        };

        const complaints = await Complaint.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: complaints
        });

    } catch (error) {
        console.error('Error fetching room complaints:', error);
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
        if (resolvedBy) {
            complaint.resolvedBy = resolvedBy;
        }
        if (status === 'Issue Solved' || status === 'Issue Canceled') {
            complaint.resolvedDate = new Date();
        }

        await complaint.save();

        res.status(200).json({
            success: true,
            message: 'Complaint status updated',
            data: complaint
        });

    } catch (error) {
        console.error('Error updating complaint status:', error);
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
        console.error('Error deleting complaint:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
