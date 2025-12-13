const bcrypt = require('bcryptjs');
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

        if (!incharge) return res.json({ message: 'Invalid Employee ID or Password' });

        const isMatch = await bcrypt.compare(password, incharge.password);
        if (!isMatch) return res.json({ message: 'Invalid Employee ID or Password' });

        const token = jwt.sign({ id: incharge._id, eid: incharge.eid }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, token });
    } catch (error) {
        res.json({ message: error.message });
    }
};

// forgot password
exports.forgotPassword = async (inchargeData) => {
    try {
        const { eid, phoneNo } = inchargeData;
        console.log(eid, phoneNo)
        const incharge = await InchargeLogin.findOne({ eid });
        console.log(incharge)

        if (!incharge) {
            throw new Error('Incharge credentials not found');
        }

        // Generate OTP 
        const otp = generateOTP();
        incharge.otp = otp;
        await incharge.save();

        // Send OTP via SMS
        const messageTemplate = 'NEC HOSTEL: Use OTP {#var1#} to reset your password. DO NOT SHARE this code with anyone. NEC Hostels, GEDNEC';
        const templateId = OTP_TEMPLATE_ID;
        console.log("complete forgot password")

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

        if (incharge.otp !== otp) return res.json({ isOTPValid: false, message: 'Invalid OTP' });

        res.status(200).json({ isOTPValid: true, message: 'OTP verified successfully' });
    } catch (error) {
        res.json({ message: error.message });
    }
};
// Update an incharge's password by eid
exports.updateInchargePassword = async (req, res) => {
    try {
        const { eid, newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const incharge = await InchargeLogin.findOneAndUpdate(
            { eid },
            { password: hashedPassword },
            { new: true }
        );
        console.log(incharge)

        if (!incharge) return res.json({ message: 'Incharge not found' });
        console.log({
            isUpdated: true,
            message: "Password updated successfully",
        });
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

