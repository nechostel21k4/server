const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust path to point to the actual db config file
const connectDB = require('./config/db');
const Complaint = require('./models/Complaint');
const Hosteler = require('./models/Hostelers');
const complaintController = require('./controllers/complaintController');

// Load env vars
dotenv.config({ path: 'backend/.env' });

// Mock Response Object
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        res.headersSent = false;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        res.headersSent = true;
        return res;
    };
    res.send = (data) => {
        res.data = data;
        res.headersSent = true;
        return res;
    }
    return res;
};

// Mock Request Object
const mockReq = (body = {}, params = {}, user = null) => {
    return {
        body,
        params,
        user
    };
};

const run = async () => {
    console.log('Connecting to DB...');
    await connectDB();

    // 1. Find a student
    console.log('Finding a student to simulate complaint...');
    const student = await Hosteler.findOne();
    if (!student) {
        console.log('No students found to test with. Please add a student first.');
        process.exit(1);
    }
    console.log(`Found Student: ${student.name} (${student.rollNo})`);

    // 2. Create Complaint
    console.log('\n--- Testing 1: Create Complaint (Student) ---');
    const createReq = mockReq({
        studentId: student._id,
        complaintText: 'TEST COMPLAINT: Fan is not working'
    });
    const createRes = mockRes();

    await complaintController.createComplaint(createReq, createRes);

    if (createRes.statusCode !== 201) {
        console.error('FAILED to create complaint. Response:', createRes.data);
        process.exit(1);
    }
    console.log('Complaint Created Successfully.');
    console.log('Response:', createRes.data);

    const complaintId = createRes.data.data._id;

    // 3. Verify in DB
    console.log('\n--- Testing 2: Verify Persistence ---');
    const storedComplaint = await Complaint.findById(complaintId);
    if (!storedComplaint) {
        console.error('FAILED: Complaint not found in DB!');
        process.exit(1);
    }
    console.log('Complaint found in DB:', storedComplaint._id);
    console.log('Status:', storedComplaint.status);

    // 3.5 Verify Room Visibility
    console.log('\n--- Testing 2.5: Verify Room Complaints ---');
    const roomReq = { query: { studentId: student._id } };
    const roomRes = mockRes();

    await complaintController.getRoomComplaints(roomReq, roomRes);

    if (roomRes.statusCode !== 200) {
        console.error('FAILED to fetch room complaints. Response:', roomRes.data);
        process.exit(1);
    }

    const roomComplaints = roomRes.data.data;
    const foundInRoom = roomComplaints.find(c => c._id.toString() === complaintId.toString());

    if (foundInRoom) {
        console.log('SUCCESS: Created complaint found in Room Complaints.');
        console.log(`Total complaints for room ${foundInRoom.roomNo}: ${roomComplaints.length}`);
    } else {
        console.error('FAILED: Complaint NOT found in Room Complaints.');
        process.exit(1);
    }

    // 4. Update Complaint (Admin)
    console.log('\n--- Testing 3: Update Status (Admin) ---');
    const updateReq = mockReq(
        { status: 'Issue Solved', resolvedBy: 'AdminBot' }, // body
        { id: complaintId } // params
    );
    const updateRes = mockRes();

    await complaintController.updateComplaintStatus(updateReq, updateRes);

    if (updateRes.statusCode !== 200) {
        console.error('FAILED to update complaint. Response:', updateRes.data);
        process.exit(1);
    }
    console.log('Complaint Updated Successfully.');
    console.log('Response:', updateRes.data);

    // 5. Verify Update
    const updatedComplaint = await Complaint.findById(complaintId);
    if (updatedComplaint.status === 'Issue Solved' && updatedComplaint.resolvedBy === 'AdminBot') {
        console.log('SUCCESS: Status verified in DB as "Issue Solved".');
    } else {
        console.error('FAILED: Status mismatch in DB.');
        console.log('Current Status:', updatedComplaint.status);
    }

    // 6. Delete Complaint (Admin)
    console.log('\n--- Testing 4: Delete Complaint (Admin) ---');
    if (!complaintId) {
        console.error('No complaint ID to delete.');
    }

    // Simulate API call
    const deleteReq = mockReq({}, { id: complaintId });
    const deleteRes = mockRes();

    await complaintController.deleteComplaint(deleteReq, deleteRes);

    if (deleteRes.statusCode !== 200) {
        console.error('FAILED to delete complaint. Response:', deleteRes.data);
        process.exit(1);
    }
    console.log('Complaint Deleted Successfully via Controller.');

    // 7. Verify Deletion
    const deletedComplaint = await Complaint.findById(complaintId);
    if (!deletedComplaint) {
        console.log('SUCCESS: Complaint successfully removed from DB.');
    } else {
        console.error('FAILED: Complaint still exists in DB.');
        process.exit(1);
    }

    console.log('\nALL CHECKS PASSED.');
    process.exit(0);
};

run().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
