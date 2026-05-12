// controllers/adminController.js
const Admin = require('../models/Admin');
const { forgotPassword, createAdminLogin, deleteAdmin } = require("./adminLoginController");
const cache = require("../utils/cache");
const { traceAction } = require("../utils/logger");

exports.createAdmin = async (req, res) => {
    try {
        const { name, eid, phoneNo, designation, password } = req.body;
        // Check if the admin already exists by eid
        const existingAdmin = await Admin.findOne({ eid });
        if (existingAdmin) {
            return res.json({ isExisted: true, success: false, message: `Admin with eid ${eid} already exists.` });
        }

        // Step 1: Create the admin
        const newAdmin = new Admin({
            name,
            eid,
            phoneNo,
            designation,
        });

        await newAdmin.save();

        // Step 2: Create the admin login
        const loginResponse = await createAdminLogin({eid,password});

        if (!loginResponse.success) {
            // Rollback: Delete the admin if creating the login failed
            await Admin.findOneAndDelete({ eid });
            return res.json({
                success: false,
                message: 'Failed to create admin login. Admin creation rolled back.',
                error: loginResponse.message,
            });
        }

        // If everything is successful, return the created admin
        await traceAction(req, `Authorized new Admin account: ${eid} (${name})`);
        res.json({ isExisted: false, success: true, message: "Successfully Admin Created" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};


// Get a single admin by username
exports.getAdminByUsername = async (req, res) => {
    try {
        const admin = await Admin.findOne({ eid: req.params.eid });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        const cacheKey = "allAdmins";
        if (cache.has(cacheKey)) {
            return res.status(200).json(cache.get(cacheKey));
        }
        const admins = await Admin.find();
        cache.set(cacheKey, admins);
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update an admin by username
exports.updateAdminByUsername = async (req, res) => {
    try {
        // ✅ SECURITY: Whitelist allowed update fields (prevent mass assignment)
        const { name, phoneNo, designation } = req.body;
        const allowedUpdates = {};
        if (name !== undefined) allowedUpdates.name = name;
        if (phoneNo !== undefined) allowedUpdates.phoneNo = phoneNo;
        if (designation !== undefined) allowedUpdates.designation = designation;

        const admin = await Admin.findOneAndUpdate({ eid: req.params.username }, allowedUpdates, { new: true });
        if (!admin) {
            return res.status(404).json({updated: false, message: 'Admin not found' });
        }
        await traceAction(req, `Updated Admin profile for: ${req.params.username}`);
        res.status(200).json({ updated: true });
    } catch (error) {
        res.status(400).json({ message: 'Update failed. Please check your input.' });
    }
};

// Delete an admin by username

exports.deleteAdminByUsername = async (req, res) => {
    try {
        const admin = await Admin.findOneAndDelete({ eid: req.params.username });
        if (!admin) {
            return res
              .status(404)
              .json({ deleted: false, message: "Admin not found" });
        }
        const deleteLoginResponse =await deleteAdmin(req.params.username);
        if (!deleteLoginResponse.deleted) {
          return res
            .status(500)
            .json({ deleted: false, message: deleteLoginResponse.message });
        }
        await traceAction(req, `De-authorized and deleted Admin: ${req.params.username}`);
        res
          .status(200)
          .json({ deleted: true, message: "Admin deleted successfully" });
    } catch (error) {
        res.status(500).json({ deleted: false, message: error.message });
    }
};

// verify admin
exports.verifyAdmin = async (req, res) => {
  try {
    // Check if the student exists
    const admin = await Admin.findOne({ eid: req.params.eid });
    if (!admin) {
      return res.json({
        isExist: false,
        phoneNo: "",
        message: "Admin not found",
      });
    }
    // If the Admin exists, call the forgotPassword function
    // Pass the hosteler object which includes phone number
    const { phoneNo, otp } = await forgotPassword(admin);
    const maskedPhone = phoneNo ? `XXXXXX${phoneNo.slice(-4)}` : 'N/A';
    res
      .status(200)
      .json({
        isExist: true,
        phoneNo: maskedPhone,
        message: "Forgot password process initiated. OTP sent.",
      });
  } catch (error) {
    res.status(500).json({ isExist: false, phoneNo:"", message: error.message });
  }
};









//Admin login