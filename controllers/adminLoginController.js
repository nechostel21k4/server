const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const AdminLogin = require('../models/AdminLogin');
const generateOTP = require("../utils/generateOTP");
const sendSMS = require("../utils/sendSMS");
const OTP_TEMPLATE_ID = process.env.OTP_TEMPLATE_ID

// Create admin login
exports.createAdminLogin = async (data) => {
    try {
        const { eid, password } = data;

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const adminLogin = new AdminLogin({
            eid,
            password: hashedPassword,
        });

        await adminLogin.save();

        return { success: true, message: 'Admin login created successfully' };
    } catch (error) {
        return { success: false, message: error.message };
    }
};


// Delete an admin by username
exports.deleteAdmin = async (eid) => {
    try {
        const admin = await AdminLogin.findOneAndDelete({ eid: eid });
        if (!admin)
            return { deleted: false, message: "error in deleting incharge" };
        return { deleted: true, message: "Incharge deleted successfully" };

    } catch (error) {
        return { deleted: false, message: error.message };
    }
};

// Admin login
exports.login = async (req, res) => {
    try {
        const { eid, password } = req.body;
        const admin = await AdminLogin.findOne({ eid: eid });
        if (!admin) return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Employee ID or Password' });

        const token = jwt.sign({ id: admin._id, eid: admin.eid, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
};

// Forgot password (send reset link or token)
exports.forgotPassword = async (admin) => {
    try {
        const { eid, phoneNo } = admin;
        const adminLogin = await AdminLogin.findOne({ eid: eid });

        if (!adminLogin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        // Generate OTP and update the database
        const otp = generateOTP();
        adminLogin.otp = otp;
        adminLogin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
        adminLogin.otpAttempts = 0;
        await adminLogin.save();

        // Send OTP via SMS
        const messageTemplate = "HostelX: Use OTP {#var1#} to reset your password. DO NOT SHARE this code with anyone. HostelX";
        const templateId = OTP_TEMPLATE_ID;

        await sendSMS(phoneNo, templateId, messageTemplate, [otp]);
        return { phoneNo, otp };
    } catch (error) {
        throw new Error(error.message);
    }

};
// Verify OTP before allowing password update
exports.verifyOtp = async (req, res) => {
    try {
        const { eid, otp } = req.body;
        const Admin = await AdminLogin.findOne({ eid: eid });

        if (!Admin) return res.status(404).json({ message: 'Admin not found' });

        if (Admin.otpAttempts >= 3) return res.json({ isOTPValid: false, message: 'Too many failed attempts. Request a new OTP.' });
        if (!Admin.otpExpiresAt || Date.now() > Admin.otpExpiresAt.getTime()) return res.json({ isOTPValid: false, message: 'OTP expired. Please request a new one.' });

        if (Admin.otp !== otp) {
            Admin.otpAttempts += 1;
            await Admin.save();
            return res.json({ isOTPValid: false, message: 'Invalid OTP' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        Admin.resetToken = resetToken;
        Admin.otp = undefined; // Clear OTP upon successful verification
        await Admin.save();

        res.status(200).json({ isOTPValid: true, resetToken, message: 'OTP verified successfully' });
    } catch (error) {
        res.json({ message: error.message });
    }
};

// Update an admin by username
exports.updateAdminPassword = async (req, res) => {
    try {
        const { eid, newPassword, resetToken } = req.body;
        const admin = await AdminLogin.findOne({ eid });
        
        if (!admin) return res.status(404).json({ isUpdated: false, message: "Admin not found" });

        if (!resetToken || admin.resetToken !== resetToken) {
            return res.status(403).json({ isUpdated: false, message: 'Unauthorized. Verify OTP first.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;
        admin.resetToken = undefined;
        await admin.save();


        res.status(200).json({ isUpdated: true, message: 'Admin updated successfully' });
    } catch (error) {
        res.status(500).json({ isUpdated: false, message: error.message });
    }
};

