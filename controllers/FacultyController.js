const Faculty = require("../models/Faculty");
const bcrypt = require("bcrypt");

// Create a new faculty member (allows multiple records now)
exports.createFaculty = async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const faculty = new Faculty({
      username,
      password: hashedPassword,
    });

    await faculty.save();
    res
      .status(201)
      .json({ success: true, message: "Faculty record created successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read the complete faculty directory
exports.getFaculty = async (req, res) => {
  try {
    const faculties = await Faculty.find().sort({ createdAt: -1 });
    res.status(200).json({ faculties });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a specific faculty record by ID
exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    const updateData = { username };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedFaculty = await Faculty.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedFaculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty record not found." });
    }

    res.status(200).json({
      success: true,
      message: "Faculty record updated successfully.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a faculty record by ID
exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedFaculty = await Faculty.findByIdAndDelete(id);

    if (!deletedFaculty) {
      return res.status(404).json({ success: false, message: "Faculty not found." });
    }

    res.status(200).json({ success: true, message: "Faculty access revoked." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Faculty login
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const faculty = await Faculty.findOne({ username });

    if (!faculty) {
      return res.status(401).json({ success: false, message: "Invalid Username or Password" });
    }

    const isMatch = await bcrypt.compare(password, faculty.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid Username or Password" });
    }

    const token = jwt.sign(
      { id: faculty._id, username: faculty.username, role: 'faculty' },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.status(200).json({ success: true, message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
