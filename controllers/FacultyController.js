const Faculty = require("../models/Faculty");

// Create a new faculty (only one record allowed)
exports.createFaculty = async (req, res) => {
  try {
    const faculty = new Faculty({
      username: req.body.username,
      password: req.body.password,
    });

    await faculty.save();
    res
      .status(201)
      .json({ success: true, message: "Faculty record created successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Read the single faculty record
exports.getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findOne();
    if (!faculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty record not found." });
    }
    res.status(200).json({ faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update the single faculty record
exports.updateFaculty = async (req, res) => {
  try {
    const updatedFaculty = await Faculty.findOneAndUpdate(
      {},
      { username: req.body.username, password: req.body.password },
      { new: true, runValidators: true }
    );

    if (!updatedFaculty) {
      return res
        .status(404)
        .json({ success: false, message: "Faculty record not found." });
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Faculty record updated successfully.",

      });
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

    if (!faculty || faculty.password !== password) {
      return res.status(401).json({ success: false, message: "Invalid Username or Password" });
    }

    const token = jwt.sign(
      { id: faculty._id, username: faculty.username },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    res.status(200).json({ success: true, message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
