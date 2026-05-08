const bcrypt = require('bcrypt');
const crypto = require('crypto');
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

// Update hosteler and create or update credentials (student registration flow)
exports.updateHostelerAndCredentials = async (req, res) => {
    try {
        const { hosteler, rollNo, password } = req.body;

        if (!hosteler || !rollNo || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters.' });
        }

        // ✅ SECURITY: Students can only register their own profile
        if (req.user.rollNo !== rollNo) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
        }

        // Ensure credentials record already exists (admin must create it first)
        const credentialsExist = await HostlerCredentials.findOne({ rollNo }).lean();
        if (!credentialsExist) {
            return res.status(404).json({ message: 'Student account not found. Contact admin.' });
        }

        // Profile update removed for security — admin manages profile data.
        // Registration is strictly for setting credentials.

        const hashedPassword = await bcrypt.hash(password, 10);
        await HostlerCredentials.findOneAndUpdate(
            { rollNo },
            { password: hashedPassword },
            { new: true }  // No upsert — student must already exist
        );

        return res.status(200).json({ success: true, message: 'Profile and credentials updated successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
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

        if (!rollNo || !password) {
            return res.status(400).json({ success: false, message: 'Roll number and password are required.' });
        }

        const hostler = await HostlerCredentials.findOne({ rollNo });
        if (!hostler) {
            return res.status(401).json({ success: false, message: 'Invalid Roll Number or Password.' });
        }

        const isMatch = await bcrypt.compare(password, hostler.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid Roll Number or Password.' });
        }

        const token = jwt.sign(
            { id: hostler._id, rollNo: hostler.rollNo, role: 'student' },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Fetch minimal student profile for session bootstrap — full profile loaded via /student/:id
        const studentProfile = await Hosteler.findOne({ rollNo }).select(
            'name rollNo hostelId roomNo college year branch gender phoneNo email parentName parentPhoneNo currentStatus'
        ).lean();

        const studentDetails = studentProfile ? {
            ...studentProfile,
            isRegistered: !!(hostler.faceDescriptor?.length > 0)
        } : {};

        return res.status(200).json({ success: true, token, student: studentDetails });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};


// forgot password
exports.forgotPassword = async (hosteler) => {
    try {
        const { rollNo, phoneNo } = hosteler;

        const hostlerCredentials = await HostlerCredentials.findOne({ rollNo: rollNo });

        if (!hostlerCredentials) {
            throw new Error('Hosteler credentials not found');
        }

        // Generate OTP and update the database
        const otp = generateOTP();
        hostlerCredentials.otp = otp;
        hostlerCredentials.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
        hostlerCredentials.otpAttempts = 0;
        await hostlerCredentials.save();

        // Send OTP via SMS
        const messageTemplate = 'HostelX: Use OTP {#var1#} to reset your password. DO NOT SHARE this code with anyone. HostelX';
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

        if (hostler.otpAttempts >= 3) return res.json({ isOTPValid: false, message: 'Too many failed attempts. Request a new OTP.' });
        if (!hostler.otpExpiresAt || Date.now() > hostler.otpExpiresAt.getTime()) return res.json({ isOTPValid: false, message: 'OTP expired. Please request a new one.' });

        if (hostler.otp !== otp) {
            hostler.otpAttempts += 1;
            await hostler.save();
            return res.json({ isOTPValid: false, message: 'Invalid OTP' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        hostler.resetToken = resetToken;
        hostler.otp = undefined; // Clear OTP upon successful verification
        await hostler.save();

        res.status(200).json({ isOTPValid: true, resetToken, message: 'OTP verified successfully' });
    } catch (error) {
        res.json({ message: error.message });
    }
};


// Update hostler's password after verifying OTP
exports.updateHostlerPassword = async (req, res) => {
    try {
        const { rollNo, newPassword, resetToken } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ isUpdated: false, message: 'Password must be at least 6 characters.' });
        }

        const hostler = await HostlerCredentials.findOne({ rollNo });

        if (!hostler) return res.status(404).json({ isUpdated: false, message: 'Student not found.' });

        if (!resetToken || hostler.resetToken !== resetToken) {
            return res.status(403).json({ isUpdated: false, message: 'Unauthorized. Verify OTP first.' });
        }

        hostler.password = await bcrypt.hash(newPassword, 10);
        hostler.resetToken = undefined;
        hostler.otpAttempts = 0; // Reset attempts after successful reset

        await hostler.save();
        return res.status(200).json({ isUpdated: true, message: 'Password updated successfully.' });
    } catch (error) {
        return res.status(500).json({ isUpdated: false, message: 'Server error. Please try again.' });
    }
};

// delete student credentials
exports.deleteHostler = async ({ params }) => {
    try {
        const { rollNo } = params;
        const hostlerCredentials = await HostlerCredentials.findOneAndDelete({ rollNo });
        return { deleted: true, message: 'Hostler credentials deletion process completed' };
    } catch (error) {
        return { deleted: false, message: error.message };
    }
};
