const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HostlerCredentials = require('../models/HostlerCredentials');
const Hosteler = require('../models/Hostelers');
const generateOTP = require('../utils/generateOTP');
const sendSMS = require('../utils/sendSMS');

const dotenv = require('dotenv');
dotenv.config();

const { ImageModel } = require("../models/ProfileImage");

const OTP_TEMPLATE_ID = process.env.OTP_TEMPLATE_ID;

// Create credentials
exports.createHostler = async (req, res) => {
    try {
        const { rollNo, password } = req.body;

        if (!rollNo || !password) {
            return res.status(400).json({ message: 'Roll number and password are required' });
        }

        const existingHostler = await HostlerCredentials.findOne({ rollNo });
        if (existingHostler) {
            return res.status(400).json({ message: 'Roll number already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const hostler = new HostlerCredentials({
            rollNo,
            password: hashedPassword
        });

        await hostler.save();
        res.status(201).json({ message: 'Hostler created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update hosteler and create or update credentials
exports.updateHostelerAndCredentials = async (req, res) => {
    try {
        const { hosteler, rollNo, password } = req.body;

        // Validate input
        if (!hosteler || !rollNo || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const updatedHosteler = await Hosteler.findOneAndUpdate(
            { rollNo },
            hosteler,
            { new: true }
        );

        const hashedPassword = await bcrypt.hash(password, 10);

        // Create or update hosteler credentials
        const updatedCredentials = await HostlerCredentials.findOneAndUpdate(
            { rollNo },
            { password: hashedPassword },
            { new: true, upsert: true } // `upsert` will create the document if it doesn't exist
        );

        await ImageModel.findOneAndUpdate(
            { rollNo },
            { path, filename },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Hosteler data and credentials updated successfully',
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Read all hostlers
exports.getAllHostlers = async (req, res) => {
    try {
        const hostlers = await HostlerCredentials.find();
        res.status(200).json(hostlers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Hostler login
exports.login = async (req, res) => {
    try {
        const { rollNo, password } = req.body;
        const hostler = await HostlerCredentials.findOne({ rollNo });

        if (!hostler) return res.json({ message: 'Invalid Roll Number or Password' });

        const isMatch = await bcrypt.compare(password, hostler.password);
        if (!isMatch) return res.json({ message: 'Invalid Roll Number or Password' });

        const token = jwt.sign({ id: hostler._id, rollNo: hostler.rollNo }, process.env.JWT_SECRET, { expiresIn: '30m' });

        // Fetch student profile details
        const studentProfile = await Hosteler.findOne({ rollNo });
        const studentDetails = studentProfile ? {
            name: studentProfile.name,
            hostelId: studentProfile.hostelId,
            branch: studentProfile.branch,
            year: studentProfile.year,
            isRegistered: hostler.faceDescriptor && hostler.faceDescriptor.length > 0 // Check registration
        } : {};

        res.status(200).json({ success: true, token, student: studentDetails });
    } catch (error) {
        res.json({ message: error.message });
    }
};

// forgot password
exports.forgotPassword = async (hosteler) => {
    try {
        const { rollNo, phoneNo } = hosteler;

        const hostlerCredentials = await HostlerCredentials.findOne({ rollNo: rollNo });

        if (!hostlerCredentials) {
            throw new Error('Hosteler credentials not found');
            res.status(200).json({ success: true, token });
        }

        // Generate OTP and update the database
        const otp = generateOTP();
        hostlerCredentials.otp = otp;
        await hostlerCredentials.save();

        // Send OTP via SMS
        const messageTemplate = 'NEC HOSTEL: Use OTP {#var1#} to reset your password. DO NOT SHARE this code with anyone. NEC Hostels, GEDNEC';
        const templateId = OTP_TEMPLATE_ID;

        await sendSMS(phoneNo, templateId, messageTemplate, [otp]);
        return { phoneNo, otp }

    } catch (error) {
        throw new Error(error.message);
    }
};

// Verify OTP before allowing password update
exports.verifyOtp = async (req, res) => {
    try {
        const { rollNo, otp } = req.body;
        const hostler = await HostlerCredentials.findOne({ rollNo });

        if (!hostler) return res.status(404).json({ message: 'Hostler not found' });

        if (hostler.otp !== otp) return res.json({ isOTPValid: false, message: 'Invalid OTP' });

        res.status(200).json({ isOTPValid: true, message: 'OTP verified successfully' });
    } catch (error) {
        res.json({ message: error.message });
    }
};


// Update hostler's password after verifying OTP
exports.updateHostlerPassword = async (req, res) => {
    try {
        const { rollNo, newPassword } = req.body;
        const hostler = await HostlerCredentials.findOne({ rollNo });

        if (!hostler) return res.status(404).json({ message: 'Hostler not found' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        hostler.password = hashedPassword;

        await hostler.save();

        res.status(200).json({ isUpdated: true, message: 'Password updated successfully' });
    } catch (error) {
        res.json({ isUpdated: true, message: error.message });
    }
};

// delete student credentials
exports.deleteHostler = async ({ params }) => {
    try {
        const { rollNo } = params;
        // console.log(`Deleting hostler credentials for roll number: ${rollNo}`);

        const hostlerCredentials = await HostlerCredentials.findOneAndDelete({ rollNo });
        return { deleted: true, message: 'Hostler credentials deletion process completed' };
    } catch (error) {
        return { deleted: false, message: error.message };
    }
};
