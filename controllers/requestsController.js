const Request = require("../models/Requests");
const Hosteler = require("../models/Hostelers");
const axios = require("axios");
const sendSMS = require("../utils/sendSMS");
const formatDate = require("../utils/formatDate");
const { ImageModel } = require("../models/ProfileImage");
const { transliterateName } = require("../utils/transliterationUtils");

const dotenv = require("dotenv");
dotenv.config();

const OUTGOING_TEMPLATE_ID = process.env.OUTGOING_TEMPLATE_ID;
const RETURN_TEMPLATE_ID = process.env.RETURN_TEMPLATE_ID;
const CANCEL_TEMPLATE_ID = process.env.CANCEL_TEMPLATE_ID;

const OUTGOING_MSG = process.env.OUTGOING_MSG;
const RETURN_MSG = process.env.RETURN_MSG;
const CANCEL_MSG = process.env.CANCEL_MSG;
exports.createRequest = async (req, res) => {
  try {
    const newRequest = new Request(req.body);

    await newRequest.save();
    res.status(201).json({ success: "true" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const request = req.body;

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo });
    if (!hosteler) {
      return res
        .status(200)
        .json({ updated: false, message: "Hosteler not found" });
    }

    // Logic for ACCEPTED requests
    if (request.status === "ACCEPTED" && request.isActive) {
      const phoneNumber = hosteler.parentPhoneNo;
      let gender = "అమ్మాయి";
      if (hosteler.gender) {
        const g = hosteler.gender.toLowerCase();
        if (g === 'male' || g === 'm') gender = "అబ్బాయి";
      } else if (request.id.startsWith("BH")) {
        gender = "అబ్బాయి";
      }

      // Translate hosteler name to Telugu
      const teluguName = await transliterateName(hosteler.name);

      let variables;

      // Determine if the request is CURRENTLY active based on time
      // This prevents future leaves from marking the student as "LEAVE" (Absent) immediately.
      const now = new Date();
      let isCurrentlyActive = false;

      if (request.type === "PERMISSION") {
        variables = [
          gender + " " + teluguName,
          formatDate.formatDate(new Date(request.date)),
          formatDate.formatTime(new Date(request.fromTime)),
          formatDate.formatDate(new Date(request.date)),
          formatDate.formatTime(new Date(request.toTime)),
          "ఔటింగ్ కి",
        ];
        // Check time range for permission
        const from = new Date(request.fromTime);
        const to = new Date(request.toTime);
        if (now >= from && now <= to) isCurrentlyActive = true;

      } else if (request.type === "LEAVE") {
        variables = [
          gender + " " + teluguName,
          formatDate.formatDate(new Date(request.fromDate)),
          formatDate.formatTime(new Date(request.fromDate)),
          formatDate.formatDate(new Date(request.toDate)),
          formatDate.formatTime(new Date(request.toDate)),
          "ఇంటికి",
        ];
        // Check date range for leave
        const from = new Date(request.fromDate);
        const to = new Date(request.toDate);
        if (now >= from && now <= to) isCurrentlyActive = true;
      }

      try {
        const smsResponse = await sendSMS(
          phoneNumber,
          OUTGOING_TEMPLATE_ID,
          OUTGOING_MSG,
          variables
        );

        if (!smsResponse.success) {
          return res.status(200).json({
            updated: false,
            message: "Failed to send SMS. Try Again",
          });
        }
      } catch (err) {
        return res
          .status(200)
          .json({ updated: false, message: "Failed to send SMS. Try Again" });
      }

      // Update Hosteler
      // always update lastRequest so history is correct.
      // ONLY update currentStatus if the leave/permission is active NOW.
      const hostelerUpdate = {
        lastRequest: request
      };

      if (isCurrentlyActive) {
        hostelerUpdate.currentStatus = request.type.toUpperCase();
      }

      await Hosteler.findOneAndUpdate(
        { rollNo: request.rollNo },
        hostelerUpdate,
        { new: true }
      );

      await Request.findByIdAndUpdate(
        request._id,
        { $set: request }, // Use $set to update fields safely
        { new: true }
      );

      return res
        .status(200)
        .json({ updated: true, message: "Notified to parent via SMS" });

    } else if (request.status === "REJECTED") {
      // Logic for REJECTED requests
      await Hosteler.findOneAndUpdate(
        { rollNo: request.rollNo },
        {
          lastRequest: request,
          currentStatus: "HOSTEL",
        },
        { new: true }
      );

      await Request.findByIdAndUpdate(
        request._id,
        { $set: request }, // Use $set to update fields safely
        { new: true }
      );

      return res
        .status(200)
        .json({ updated: true, message: "Request Rejected Successfully" });
    }

    // Fallback Update
    await Request.findByIdAndUpdate(
      request._id,
      { $set: request },
      { new: true }
    );

    return res
      .status(200)
      .json({ updated: true, message: "Request updated successfully." });
  } catch (error) {
    console.error("Error approving request:", error);
    return res.status(200).json({ updated: false, message: "Server error" });
  }
};

// REQUESTS OPERATIONS

// Mark request as arrived

exports.arriveRequest = async (req, res) => {
  try {
    const request = req.body;

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo });
    if (!hosteler) {
      return res
        .status(200)
        .json({ updated: false, message: "Hosteler not found" });
    }

    if (hosteler.lastRequest.id === request.id) {
      const phoneNumber = hosteler.parentPhoneNo;
      let gender = "అమ్మాయి";
      if (hosteler.gender) {
        const g = hosteler.gender.toLowerCase();
        if (g === 'male' || g === 'm') gender = "అబ్బాయి";
      } else if (request.id.startsWith("BH")) {
        gender = "అబ్బాయి";
      }

      // Translate hosteler name to Telugu
      const teluguName = await transliterateName(hosteler.name);

      const variables = [
        gender + " " + teluguName,
        formatDate.formatDate(new Date(request.arrived.time)),
        formatDate.formatTime(new Date(request.arrived.time)),
        request.type === "LEAVE" ? "ఇంటి" : "ఔటింగ్",
      ];

      try {
        const smsResponse = await sendSMS(
          phoneNumber,
          RETURN_TEMPLATE_ID,
          RETURN_MSG,
          variables
        );
        if (!smsResponse.success) {
          return res.status(200).json({
            updated: false,
            message: "Failed to send SMS. Try Again",
          });
        }
      } catch (error) {
        console.log(error);
        return res
          .status(200)
          .json({ updated: false, message: "Failed to send SMS. Try Again" });
      }

      await Hosteler.findOneAndUpdate(
        { rollNo: request.rollNo },
        {
          lastRequest: request,
          currentStatus:
            request.status === "ACCEPTED"
              ? request.type.toUpperCase()
              : "HOSTEL",
        },
        { new: true }
      );

      await Request.findByIdAndUpdate(
        request._id,
        { $set: request }, // Use $set to update fields safely
        { new: true }
      );

      return res
        .status(200)
        .json({ updated: true, message: "Notified to parent via SMS" });
    }

    await Request.findByIdAndUpdate(
      request._id,
      { $set: request }, // Use $set to update fields safely
      { new: true }
    );

    return res
      .status(200)
      .json({ updated: true, message: "This is not a current active Request but updated successfully.Please find correct one related to student" });
  } catch (error) {
    console.error("Error Arriving request:", error);
    return res.status(200).json({ updated: false, message: "Server error" });
  }
};

exports.CancelRequestById = async (req, res) => {
  try {
    const request = req.body;

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo });
    if (!hosteler) {
      return res
        .status(200)
        .json({ updated: false, message: "Hosteler not found" });
    }

    if (hosteler.lastRequest.id === request.id) {
      if (request.status === "CANCELLED02") {
        const phoneNumber = hosteler.parentPhoneNo;
        let gender = "అమ్మాయి";
        if (hosteler.gender) {
          const g = hosteler.gender.toLowerCase();
          if (g === 'male' || g === 'm') gender = "అబ్బాయి";
        } else if (request.id.startsWith("BH")) {
          gender = "అబ్బాయి";
        }

        // Translate hosteler name to Telugu
        const teluguName = await transliterateName(request.name);

        let variables = [];
        if (request.type === "PERMISSION") {
          variables = [
            gender + " " + teluguName,
            formatDate.formatDate(new Date(request.date)),
            formatDate.formatTime(new Date(request.fromTime)),
            formatDate.formatDate(new Date(request.date)),
            formatDate.formatTime(new Date(request.toTime)),
            "ఔటింగ్ కి ",
          ];
        } else if (request.type === "LEAVE") {
          variables = [
            gender + " " + teluguName,
            formatDate.formatDate(new Date(request.fromDate)),
            formatDate.formatTime(new Date(request.fromDate)),
            formatDate.formatDate(new Date(request.toDate)),
            formatDate.formatTime(new Date(request.toDate)),
            "ఇంటికి ",
          ];
        }

        try {
          const smsResponse = await sendSMS(
            phoneNumber,
            CANCEL_TEMPLATE_ID,
            CANCEL_MSG,
            variables
          );

          if (!smsResponse.success) {
            return res.status(200).json({
              updated: false,
              message: "Failed to send SMS. Try Again",
            });
          }
        } catch (err) {
          return res
            .status(200)
            .json({ updated: false, message: "Failed to send SMS. Try Again" });
        }

        await Hosteler.findOneAndUpdate(
          { rollNo: request.rollNo },
          {
            lastRequest: request,
            currentStatus: "HOSTEL",
          },
          { new: true }
        );

        await Request.findByIdAndUpdate(
          request._id,
          { $set: request }, // Use $set to update fields safely
          { new: true }
        );

        return res
          .status(200)
          .json({ updated: true, message: "Notified to parent via SMS" });
      } else if (request.status === "CANCELLED01") {
        await Hosteler.findOneAndUpdate(
          { rollNo: request.rollNo },
          {
            lastRequest: request,
            currentStatus: "HOSTEL",
          },
          { new: true }
        );

        await Request.findByIdAndUpdate(
          request._id,
          { $set: request }, // Use $set to update fields safely
          { new: true }
        );

        return res
          .status(200)
          .json({ updated: true, message: "You can apply another request" });
      }
    }

    await Request.findByIdAndUpdate(
      request._id,
      { $set: request }, // Use $set to update fields safely
      { new: true }
    );

    return res
      .status(200)
      .json({ updated: true, message: "This is not a current active Request but updated successfully.Please find correct one related to student" });
  } catch (error) {
    console.error("Error Cancelling request:", error);
    return res.status(200).json({ updated: false, message: "Server error" });
  }
};

// GET SECTION
exports.getAllRequestsByRollNumber = async (req, res) => {
  try {
    const rollno = req.params.RollNo;
    const requests = await Request.find({ rollNo: rollno }).sort({
      createdAt: -1,
    });
    // console.log(requests);
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get a single request by ID
exports.getRequestById = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get pending requests(requestes that should be seen by incharge to accept or reject)
exports.getPendingRequestsByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    let pendingRequests;

    if (hostelId.toUpperCase() == "ALL") {
      pendingRequests = await Request.find({
        status: "SUBMITTED",
        isActive: true,
      }).sort({ createdAt: -1 });
    } else {
      pendingRequests = await Request.find({
        hostelId: hostelId,
        status: "SUBMITTED",
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (pendingRequests.length === 0) {
      return res.json({
        message: "No pending requests found for this hostel ID.",
        pendingRequests: [],
        images: [],
      });
    }

    // Extract usernames from pending requests
    const usernames = pendingRequests.map((request) => request.rollNo);

    // Fetch images for those usernames
    const images = await ImageModel.find({
      username: { $in: usernames },
    }).select("username filename path");

    // Construct image response
    const imageData = images.map((img) => ({
      username: img.username,
      imagePath: img.path && img.path.startsWith('http')
        ? img.path
        : `${req.protocol}://${req.get('host')}/uploads/${img.filename}`,
    }));

    res.status(200).json({
      pendingRequests,
      images: imageData, // Separate array for images
    });
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
// Get all approved requests that have not been returned, filtered by hostelid
exports.acceptedRequestsByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    let acceptedRequests;

    if (hostelId.toUpperCase() === "ALL") {
      acceptedRequests = await Request.find({
        status: "ACCEPTED",
        isActive: true,
      }).sort({ createdAt: -1 });
    } else {
      acceptedRequests = await Request.find({
        hostelId: hostelId,
        status: "ACCEPTED",
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (acceptedRequests.length === 0) {
      return res.json({
        message: "No accepted requests found for this hostel ID.",
        acceptedRequests: [],
        images: [],
      });
    }

    // Extract usernames from accepted requests
    const usernames = acceptedRequests.map((request) => request.rollNo);

    // Fetch images for those usernames
    const images = await ImageModel.find({
      username: { $in: usernames },
    }).select("username filename path");

    // Construct image response
    const imageData = images.map((img) => ({
      username: img.username,
      imagePath: img.path && img.path.startsWith('http')
        ? img.path
        : `${req.protocol}://${req.get('host')}/uploads/${img.filename}`,
    }));

    res.status(200).json({
      acceptedRequests,
      images: imageData, // Separate array for images
    });
  } catch (error) {
    console.error("Error fetching accepted requests:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};

// Get all arrived requests between two dates
exports.getArrivedRequestsBetweenDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(startDate);
    console.log(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.json({ message: "Invalid date format" });
    }
    let requests;
    if (req.params.hostelId.toUpperCase() == "ALL") {
      // Find all requests where 'arrived.time' is between startDate and endDate
      requests = await Request.find({
        arrived: { $ne: null }, // Ensure 'arrived' is not null
        "arrived.time": { $gte: start, $lte: end },
      }).sort({ "arrived.time": -1 });
    } else {
      // Find all requests where 'arrived.time' is between startDate and endDate
      requests = await Request.find({
        hostelId: req.params.hostelId,
        arrived: { $ne: null }, // Ensure 'arrived' is not null
        "arrived.time": { $gte: start, $lte: end },
      }).sort({ "arrived.time": -1 });
    }

    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching arrived requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all accepted requests between two dates
exports.getAcceptedRequestsBetweenDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    // Ensure dates are provided and valid
    if (!startDate || !endDate) {
      return res.json({ message: "Start date and end date are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check if the provided dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.json({ message: "Invalid date format" });
    }

    let requests;

    if (req.params.hostelId.toUpperCase() == "ALL") {
      // Find all requests where 'accepted.time' is between startDate and endDate
      requests = await Request.find({
        accepted: { $ne: null }, // Ensure 'accepted' is not null
        "accepted.time": { $gte: start, $lte: end },
      }).sort({ "accepted.time": -1 });
    } else {
      // Find all requests where 'accepted.time' is between startDate and endDate and match hostelId
      requests = await Request.find({
        hostelId: req.params.hostelId,
        accepted: { $ne: null }, // Ensure 'accepted' is not null
        "accepted.time": { $gte: start, $lte: end },
      }).sort({ "accepted.time": -1 });
    }

    // Send the filtered requests in response
    res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching accepted requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE SECTION
// Delete a request by ID
exports.deleteRequestById = async (req, res) => {
  try {
    const request = await Request.findByIdAndDelete(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a request by ROLLNO
exports.deleteRequestByRollNo = async ({ params }) => {
  try {
    const { rollNo } = params;
    const request = await Request.deleteMany({ rollNo: rollNo });
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.status(200).json({ message: "Request deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//REQUEST COUNTS

const moment = require("moment"); // For date manipulation

//today total requests
exports.getTodayRequestCounts = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    // Count total requests for today
    const totalRequests = await Request.countDocuments({
      date: { $gte: today, $lte: endOfDay },
      status: "ACCEPTED",
    });

    // Count requests based on type for today
    const typeCounts = await Request.aggregate([
      {
        $match: {
          date: { $gte: today, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert the aggregation result into a more readable format
    const counts = {
      total: totalRequests,
      permission: 0,
      leave: 0,
    };

    typeCounts.forEach((type) => {
      if (type._id === "PERMISSION") counts.permission = type.count;
      else if (type._id === "LEAVE") counts.leave = type.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//TODAY TOTAL REQUESTS by hostelid
exports.getTodayRequestCountsByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params; // Get hostelId from request parameters

    if (!hostelId) {
      return res.status(400).json({ message: "Hostel ID is required" });
    }

    // Get today's date in YYYY-MM-DD format
    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    // Count total requests for today based on hostelId
    const totalRequests = await Request.countDocuments({
      hostelId,
      date: { $gte: today, $lte: endOfDay },
    });

    // Count requests based on type for today and hostelId
    const typeCounts = await Request.aggregate([
      {
        $match: {
          hostelId,
          date: { $gte: today, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    // Convert the aggregation result into a more readable format
    const counts = {
      total: totalRequests,
      permission: 0,
      leave: 0,
      permisssionArray: [],
      leaveArray: [],
    };

    typeCounts.forEach((type) => {
      if (type._id === "PERMISSION") counts.permission = type.count;
      else if (type._id === "LEAVE") counts.leave = type.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get today's accepted requests
exports.getTodayAcceptedByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;

    if (!hostelId) {
      return res.status(400).json({ message: "Hostel ID is required" });
    }

    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const totalRequests = await Request.countDocuments({
      hostelId,
      "accepted.time": { $gte: today, $lte: endOfDay },
    });

    const typeCounts = await Request.aggregate([
      {
        $match: {
          hostelId,
          "accepted.time": { $gte: today, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          requests: { $push: "$$ROOT" },
        },
      },
    ]);

    const counts = {
      total: totalRequests,
      permission: 0,
      leave: 0,
      permissionArray: [],
      leaveArray: [],
    };

    typeCounts.forEach((type) => {
      if (type._id === "PERMISSION") {
        counts.permission = type.count;
        counts.permissionArray = type.requests;
      } else if (type._id === "LEAVE") {
        counts.leave = type.count;
        counts.leaveArray = type.requests;
      }
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get today's arrived requests
exports.getTodayArrivedByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;

    if (!hostelId) {
      return res.status(400).json({ message: "Hostel ID is required" });
    }

    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const totalRequests = await Request.countDocuments({
      hostelId,
      "arrived.time": { $gte: today, $lte: endOfDay },
    });

    const typeCounts = await Request.aggregate([
      {
        $match: {
          hostelId,
          "arrived.time": { $gte: today, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          requests: { $push: "$$ROOT" },
        },
      },
    ]);

    const counts = {
      total: totalRequests,
      permission: 0,
      leave: 0,
      permissionArray: [],
      leaveArray: [],
    };

    typeCounts.forEach((type) => {
      if (type._id === "PERMISSION") {
        counts.permission = type.count;
        counts.permissionArray = type.requests;
      } else if (type._id === "LEAVE") {
        counts.leave = type.count;
        counts.leaveArray = type.requests;
      }
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
