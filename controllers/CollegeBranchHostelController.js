const { College, Branch, Hostel } = require("../models/CollegeBranchHostelSchema");


exports.getAllColleges = async (req, res) => {
  try {
    const colleges = await College.find(); // Fetch all colleges from the database
    res.status(200).json({ success: true, colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.AddandGetColleges = async (req, res) => {
  try {
    const newCollege = new College();
    await newCollege.save();
    const colleges = await College.find(); // Fetch all colleges from the database
    res.status(200).json({ success: true, colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCollegeById = async (req, res) => {
  try {
    const { id } = req.params; // Get _id from request parameters
    const updateData = req.body; // Get update data from request body

    const updatedCollege = await College.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    });

    if (!updatedCollege) {
      return res.status(200).json({ success: false, message: "College not found." });
    }

    res.status(200).json({ success: true, message: "College updated successfully.", college: updatedCollege });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteCollegeById = async (req, res) => {
  try {
    const { id } = req.params; // Extract _id from request parameters

    const deletedCollege = await College.findByIdAndDelete(id); // Delete by _id

    if (!deletedCollege) {
      return res.status(200).json({ success: false, message: "College not found." });
    }

    res.status(200).json({ success: true, message: "College deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//branches 

exports.getAllBranches = async (req, res) => {
  try {
    const branches = await Branch.find(); // Fetch all brances from the database
    res.status(200).json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.AddandGetBranches = async (req, res) => {
  try {
    const newBranch = new Branch();
    await newBranch.save();
    const branches = await Branch.find(); // Fetch all branches from the database
    res.status(200).json({ success: true, branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBranchById = async (req, res) => {
  try {
    const { id } = req.params; // Get _id from request parameters
    const updateData = req.body; // Get update data from request body

    const updatedBranch = await Branch.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    });

    if (!updatedBranch) {
      return res.status(200).json({ success: false, message: "Branch not found." });
    }

    res.status(200).json({ success: true, message: "Branch updated successfully.", branch: updatedBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteBranchById = async (req, res) => {
  try {
    const { id } = req.params; // Extract _id from request parameters

    const deletedBranch = await Branch.findByIdAndDelete(id); // Delete by _id

    if (!deletedBranch) {
      return res.status(200).json({ success: false, message: "Branch not found." });
    }

    res.status(200).json({ success: true, message: "Branch deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Hostel Allowed IPs
exports.updateHostelIPs = async (req, res) => {
  try {
    const { hostelCode, ipAddresses } = req.body;

    if (!hostelCode || !Array.isArray(ipAddresses)) {
      return res.status(400).json({ message: 'Invalid request. hostelCode and ipAddresses array required.' });
    }

    const updatedHostel = await Hostel.findOneAndUpdate(
      { code: hostelCode },
      { $set: { allowedIPs: ipAddresses } },
      { new: true }
    );

    if (!updatedHostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    res.status(200).json({
      message: 'Allowed IPs updated successfully',
      hostel: updatedHostel
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Hostel Settings (Time)
exports.updateHostelSettings = async (req, res) => {
  try {
    const { hostelCode, attendanceStartTime, attendanceEndTime } = req.body;

    if (!hostelCode) {
      return res.status(400).json({ message: 'Hostel code is required.' });
    }

    const updateFields = {};
    if (attendanceStartTime) updateFields.attendanceStartTime = attendanceStartTime;
    if (attendanceEndTime) updateFields.attendanceEndTime = attendanceEndTime;

    const updatedHostel = await Hostel.findOneAndUpdate(
      { code: hostelCode },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedHostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    res.status(200).json({
      message: 'Hostel settings updated successfully',
      hostel: updatedHostel
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Hostel CRUD

exports.getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find(); // Fetch all hostels from the database
    res.status(200).json({ success: true, hostels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.AddandGetHostels = async (req, res) => {
  try {
    const newHostel = new Hostel();
    await newHostel.save();
    const hostels = await Hostel.find(); // Fetch all hostels from the database
    res.status(200).json({ success: true, hostels });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateHostelById = async (req, res) => {
  try {
    const { id } = req.params; // Get _id from request parameters
    const updateData = req.body; // Get update data from request body

    const updatedHostel = await Hostel.findByIdAndUpdate(id, updateData, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied
    });

    if (!updatedHostel) {
      return res.status(200).json({ success: false, message: "Hostel not found." });
    }

    res.status(200).json({ success: true, message: "Hostel updated successfully.", hostel: updatedHostel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteHostelById = async (req, res) => {
  try {
    const { id } = req.params; // Extract _id from request parameters

    const deletedHostel = await Hostel.findByIdAndDelete(id); // Delete by _id

    if (!deletedHostel) {
      return res.status(200).json({ success: false, message: "Hostel not found." });
    }

    res.status(200).json({ success: true, message: "Hostel deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};