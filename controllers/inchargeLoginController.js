const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const InchargeLogin = require('../models/InchargeLogin');
const sendSMS = require('../utils/sendSMS')
const generateOTP = require('../utils/generateOTP')


const dotenv = require('dotenv');
dotenv.config();

const OTP_TEMPLATE_ID = process.env.OTP_TEMPLATE_ID;

exports.createInchargeLogin = async (req, res) => {
    try {
        const { eid, password } = req.body;

        const existingIncharge = await InchargeLogin.findOne({ eid });
        if (existingIncharge) {
            return { success: false, message: 'Employee ID already exists' };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const incharge = new InchargeLogin({
            eid,
            password: hashedPassword,
        });

        await incharge.save();
        return { success: true, message: 'Incharge created successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

// Incharge login
exports.login = async (req, res) => {
    try {
        const { eid, password } = req.body;
        const incharge = await InchargeLogin.findOne({ eid });

        if (!incharge) return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });

        const isMatch = await bcrypt.compare(password, incharge.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });

        const token = jwt.sign({ id: incharge._id, eid: incharge.eid, role: 'incharge' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// forgot password
exports.forgotPassword = async (inchargeData) => {
    try {
        const { eid, phoneNo } = inchargeData;
        const incharge = await InchargeLogin.findOne({ eid });

        if (!incharge) {
            throw new Error('Incharge credentials not found');
        }

        // Generate OTP 
        const otp = generateOTP();
        incharge.otp = otp;
        incharge.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        incharge.otpAttempts = 0;
        await incharge.save();

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
        const { eid, otp } = req.body;
        const incharge = await InchargeLogin.findOne({ eid });

        if (!incharge) return res.status(404).json({ message: 'Incharge not found' });

        if (incharge.otpAttempts >= 3) return res.json({ isOTPValid: false, message: 'Too many failed attempts. Request a new OTP.' });
        if (!incharge.otpExpiresAt || Date.now() > incharge.otpExpiresAt.getTime()) return res.json({ isOTPValid: false, message: 'OTP expired. Please request a new one.' });

        if (incharge.otp !== otp) {
            incharge.otpAttempts += 1;
            await incharge.save();
            return res.json({ isOTPValid: false, message: 'Invalid OTP' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        incharge.resetToken = resetToken;
        incharge.otp = undefined; // Clear OTP upon successful verification
        await incharge.save();

        res.status(200).json({ isOTPValid: true, resetToken, message: 'OTP verified successfully' });
    } catch (error) {
        res.json({ message: error.message });
    }
};
// Update an incharge's password by eid
exports.updateInchargePassword = async (req, res) => {
    try {
        const { eid, newPassword, resetToken } = req.body;
        const incharge = await InchargeLogin.findOne({ eid });
        
        if (!incharge) return res.status(404).json({ isUpdated: false, message: 'Incharge not found' });

        if (!resetToken || incharge.resetToken !== resetToken) {
            return res.status(403).json({ isUpdated: false, message: 'Unauthorized. Verify OTP first.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        incharge.password = hashedPassword;
        incharge.resetToken = undefined;
        await incharge.save();

        if (!incharge) return res.json({ message: 'Incharge not found' });

        res.status(200).json({ isUpdated: true, message: 'Password updated successfully' });
    } catch (error) {
        res.json({ isUpdated: false, message: error.message });
    }
};

// Read all incharges (admins)
exports.getAllIncharges = async (req, res) => {
    try {
        const incharges = await InchargeLogin.find();
        res.status(200).json(incharges);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete an incharge login by eid
exports.deleteInchargeLogin = async (req) => {
    try {
        const { eid } = req.params;
        const incharge = await InchargeLogin.findOneAndDelete({ eid });

        if (!incharge) {
            return { deleted: false, message: 'Incharge not found' };
        }
        return { deleted: true, message: 'Incharge deleted successfully' };
    } catch (error) {
        return { deleted: false, message: error.message };
    }
};

