const mongoose = require("mongoose");
const Hosteler = require("../models/Hostelers");
const { ImageModel } = require("../models/ProfileImage");

// Helper function to convert date strings to ISO format
const convertDate = (dateString) => {
  const [day, month, year] = dateString.split("-");
  return new Date(`${year}-${month}-${day}`);
};

// add  Hostlers data through excel file
exports.addHostelers = async (req, res) => {

  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).send("Invalid data format or empty array.");
  }

  const jsonData = req.body;

  // Filter out records with null or missing RollNo
  const validData = jsonData.filter((data) => data.rollNo != null);

  // Process each record
  const processedData = validData.map((data) => {
    // Convert date if present


    // Ensure field names match the schema
    return {
      hostelId: data.hostelId.toUpperCase(),
      rollNo: data.rollNo.toUpperCase(),
      name: data.name,
      college: data.college.toUpperCase(),
      year: data.year,
      branch: data.branch.toUpperCase(),
      gender: data.gender.toUpperCase(),
      phoneNo: data.phoneNo,
      email: data.email,
      roomNo: data.roomNo,
      parentName: data.parentName,
      parentPhoneNo: data.parentPhoneNo,
      currentStatus: data.currentStatus || "HOSTEL",
      requestCount: data.requestCount || 0,
      lastRequest: data.lastRequest || null,
    };
  });

  try {
    // Find existing rollNos
    const existingRollNos = await Hosteler.find({
      rollNo: { $in: processedData.map((data) => data.rollNo) },
    }).select("rollNo");

    // Create a set of existing rollNos for quick lookup
    const existingRollNoSet = new Set(
      existingRollNos.map((hosteler) => hosteler.rollNo)
    );

    // Filter out data with existing rollNos
    const uniqueData = processedData.filter(
      (data) => !existingRollNoSet.has(data.rollNo)
    );

    // Unique data length: uniqueData.length

    // Insert only the unique records
    const result = await Hosteler.insertMany(uniqueData, { ordered: false }); 

    res.status(200).send({
      added: true,
      message: `${result.length} records inserted successfully`,
    });
  } catch (err) {
    res.status(500).send("Error inserting data");
  }
};

exports.uploadImage = async (req, res) => {
  try {
    const { path, filename } = req.file;
    const username = req.params.username;

    await ImageModel.findOneAndUpdate(
      { username },
      { path, filename },
      { new: true, upsert: true }
    );

    res
      .status(200)
      .send({ imageUploaded: true, message: "Image uploaded successfully" });
  } catch {
    res
      .status(500)
      .send({ imageUploaded: false, message: "Image upload failed" });
  }
};
