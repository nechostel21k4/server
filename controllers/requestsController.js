const Request = require("../models/Requests");
const Hosteler = require("../models/Hostelers");
const Incharge = require("../models/Incharge");
const moment = require("moment");
const sendSMS = require("../utils/sendSMS");
const formatDate = require("../utils/formatDate");
const { ImageModel } = require("../models/ProfileImage");
const { transliterateName } = require("../utils/transliterationUtils");

const OUTGOING_TEMPLATE_ID = process.env.OUTGOING_TEMPLATE_ID;
const RETURN_TEMPLATE_ID = process.env.RETURN_TEMPLATE_ID;
const CANCEL_TEMPLATE_ID = process.env.CANCEL_TEMPLATE_ID;
const OUTGOING_MSG = process.env.OUTGOING_MSG;
const RETURN_MSG = process.env.RETURN_MSG;
const CANCEL_MSG = process.env.CANCEL_MSG;

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────

const buildImageUrl = (img, req) => {
  if (!img) return null;
  if (img.path?.startsWith("http")) return img.path;
  return `${req.protocol}://${req.get("host")}/uploads/${img.filename}`;
};

const fetchImagesMap = async (rollNos, req) => {
  const images = await ImageModel.find({ username: { $in: rollNos } })
    .select("username filename path")
    .lean();
  return images.reduce((map, img) => {
    map[img.username] = buildImageUrl(img, req);
    return map;
  }, {});
};

/** Determine the Telugu gender pronoun from hosteler data */
const getTeluguGender = (hosteler, requestId = "") => {
  if (hosteler.gender) {
    const g = hosteler.gender.toLowerCase();
    if (g === "male" || g === "m") return "అబ్బాయి";
  }
  if (requestId.startsWith("BH")) return "అబ్బాయి";
  return "అమ్మాయి";
};

/** Check if a request's time window is currently active */
const isRequestCurrentlyActive = (request) => {
  const now = new Date();
  if (request.type === "PERMISSION" && request.fromTime && request.toTime) {
    return now >= new Date(request.fromTime) && now <= new Date(request.toTime);
  }
  if (request.type === "LEAVE" && request.fromDate && request.toDate) {
    return now >= new Date(request.fromDate) && now <= new Date(request.toDate);
  }
  return false;
};

/** Build the SMS variables array for outgoing/cancel messages */
const buildOutgoingVariables = (gender, teluguName, request) => {
  if (request.type === "PERMISSION") {
    return [
      `${gender} ${teluguName}`,
      formatDate.formatDate(new Date(request.date)),
      formatDate.formatTime(new Date(request.fromTime)),
      formatDate.formatDate(new Date(request.date)),
      formatDate.formatTime(new Date(request.toTime)),
      "ఔటింగ్ కి",
    ];
  }
  return [
    `${gender} ${teluguName}`,
    formatDate.formatDate(new Date(request.fromDate)),
    formatDate.formatTime(new Date(request.fromDate)),
    formatDate.formatDate(new Date(request.toDate)),
    formatDate.formatTime(new Date(request.toDate)),
    "ఇంటికి",
  ];
};

/** Emit a socket event for real-time updates */
const emitRequestUpdate = (req, hostelId) => {
  const io = req.app.get("io");
  if (io) io.emit("requestUpdated", { hostelId });
};

// ─────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────

exports.createRequest = async (req, res) => {
  try {
    // ✅ SECURITY: Force the request to be linked to the authenticated user
    // This prevents student A from creating a request for student B
    const requestData = {
      ...req.body,
      rollNo: req.user.role === 'student' ? req.user.rollNo : req.body.rollNo
    };

    const newRequest = await Request.create(requestData);
    return res.status(201).json({ success: true, request: newRequest });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
//  APPROVE / REJECT
// ─────────────────────────────────────────────

exports.approveRequest = async (req, res) => {
  try {
    const request = req.body;

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo }).lean();
    if (!hosteler) {
      return res.status(404).json({ updated: false, message: "Student not found." });
    }

    if (request.status === "ACCEPTED" && request.isActive) {
      const hostelerUpdate = { lastRequest: request };
      if (isRequestCurrentlyActive(request)) {
        hostelerUpdate.currentStatus = request.type.toUpperCase();
      }

      // ✅ Write to DB FIRST — SMS failure must never cause data loss
      await Promise.all([
        Hosteler.updateOne({ rollNo: request.rollNo }, hostelerUpdate),
        Request.findByIdAndUpdate(request._id, { $set: request }),
      ]);

      emitRequestUpdate(req, request.hostelId);

      // Send SMS (non-blocking, but catch critical credit errors)
      const teluguName = await transliterateName(hosteler.name);
      const gender = getTeluguGender(hosteler, request.id);
      const variables = buildOutgoingVariables(gender, teluguName, request);
      const smsResult = await sendSMS(hosteler.parentPhoneNo, OUTGOING_TEMPLATE_ID, OUTGOING_MSG, variables);
      
      if (smsResult.isBalanceError) {
          return res.status(200).json({ 
              updated: true, 
              message: "Request approved, but SMS failed: Insufficient Balance. Please top up your credits.",
              isBalanceError: true 
          });
      }

      return res.status(200).json({ updated: true, message: "Request approved. Parent notification queued." });
    }

    if (request.status === "REJECTED") {
      await Promise.all([
        Hosteler.updateOne({ rollNo: request.rollNo }, { lastRequest: request, currentStatus: "HOSTEL" }),
        Request.findByIdAndUpdate(request._id, { $set: request }),
      ]);
      emitRequestUpdate(req, request.hostelId);
      return res.status(200).json({ updated: true, message: "Request rejected." });
    }

    // Generic fallback
    await Request.findByIdAndUpdate(request._id, { $set: request });
    return res.status(200).json({ updated: true, message: "Request updated." });
  } catch (error) {
    return res.status(500).json({ updated: false, message: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────
//  ARRIVE (Student returned)
// ─────────────────────────────────────────────

exports.arriveRequest = async (req, res) => {
  try {
    const request = req.body;

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo }).lean();
    if (!hosteler) {
      return res.status(404).json({ updated: false, message: "Student not found." });
    }

    if (hosteler.lastRequest?.id === request.id) {
      // ✅ Write to DB FIRST — SMS failure must never block arrival confirmation
      await Promise.all([
        Hosteler.updateOne({ rollNo: request.rollNo }, { lastRequest: request, currentStatus: "HOSTEL" }),
        Request.findByIdAndUpdate(request._id, { $set: request }),
      ]);

      emitRequestUpdate(req, request.hostelId);

      // Send arrival SMS
      const teluguName = await transliterateName(hosteler.name);
      const gender = getTeluguGender(hosteler, request.id);
      const variables = [
        `${gender} ${teluguName}`,
        formatDate.formatDate(new Date(request.arrived.time)),
        formatDate.formatTime(new Date(request.arrived.time)),
        request.type === "LEAVE" ? "ఇంటి" : "ఔటింగ్",
      ];
      const smsResult = await sendSMS(hosteler.parentPhoneNo, RETURN_TEMPLATE_ID, RETURN_MSG, variables);

      if (smsResult.isBalanceError) {
          return res.status(200).json({ 
              updated: true, 
              message: "Arrival confirmed, but SMS failed: Insufficient Balance. Please top up your credits.",
              isBalanceError: true 
          });
      }

      return res.status(200).json({ updated: true, message: "Arrival confirmed. Parent notification queued." });
    }

    // The request is not the current active one, just update it
    await Request.findByIdAndUpdate(request._id, { $set: request });
    return res.status(200).json({ updated: true, message: "Request updated (not the current active request)." });
  } catch (error) {
    return res.status(500).json({ updated: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
//  CANCEL
// ─────────────────────────────────────────────

exports.CancelRequestById = async (req, res) => {
  try {
    const request = req.body;

    // ✅ SECURITY: Students can only cancel their own requests
    if (req.user.role === 'student' && req.user.rollNo !== request.rollNo) {
      return res.status(403).json({ updated: false, message: "Forbidden: You can only cancel your own requests." });
    }

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo }).lean();
    if (!hosteler) {
      return res.status(404).json({ updated: false, message: "Student not found." });
    }

    if (hosteler.lastRequest?.id === request.id) {
      // ✅ Write to DB FIRST for both cancel types
      await Promise.all([
        Hosteler.updateOne({ rollNo: request.rollNo }, { lastRequest: request, currentStatus: "HOSTEL" }),
        Request.findByIdAndUpdate(request._id, { $set: request }),
      ]);

      emitRequestUpdate(req, request.hostelId);

      // CANCELLED02 = Incharge-cancelled (after acceptance): notify parent
      if (request.status === "CANCELLED02") {
        const teluguName = await transliterateName(request.name);
        const gender = getTeluguGender(hosteler, request.id);
        const variables = buildOutgoingVariables(gender, teluguName, request);
        const smsResult = await sendSMS(hosteler.parentPhoneNo, CANCEL_TEMPLATE_ID, CANCEL_MSG, variables);

        if (smsResult.isBalanceError) {
          return res.status(200).json({ 
              updated: true, 
              message: "Request cancelled, but SMS failed: Insufficient Balance. Please top up your credits.",
              isBalanceError: true 
          });
        }
      }

      const msg = request.status === "CANCELLED02" ? "Request cancelled. Parent notification queued." : "Request cancelled. You can apply again.";
      return res.status(200).json({ updated: true, message: msg });
    }

    // Not the current active request — just persist the update
    await Request.findByIdAndUpdate(request._id, { $set: request });
    return res.status(200).json({ updated: true, message: "Request updated." });
  } catch (error) {
    return res.status(500).json({ updated: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────────
//  READ — Single / By Roll Number
// ─────────────────────────────────────────────

exports.getRequestById = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ message: "Request not found." });

    // ✅ SECURITY: Students can only view their own request
    if (req.user.role === 'student' && req.user.rollNo !== request.rollNo) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only view your own requests." });
    }

    return res.status(200).json(request);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllRequestsByRollNumber = async (req, res) => {
  try {
    const { RollNo } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // ✅ SECURITY: Students can only view their own request history
    if (req.user.role === 'student' && req.user.rollNo !== RollNo) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only view your own request history." });
    }

    // ✅ SECURITY: Incharges can only view history of students in their assigned hostel
    if (req.user.role === 'incharge') {
      const [student, incharge] = await Promise.all([
        Hosteler.findOne({ rollNo: RollNo }).select('hostelId').lean(),
        Incharge.findOne({ eid: req.user.eid }).select('hostelId').lean()
      ]);

      if (!student || !incharge || student.hostelId !== incharge.hostelId) {
        return res.status(403).json({ success: false, message: "Forbidden: Student belongs to another residency module." });
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [totalCount, requests] = await Promise.all([
      Request.countDocuments({ rollNo: RollNo }),
      Request.find({ rollNo: RollNo })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    return res.status(200).json({
      success: true,
      requests,
      totalCount,
      hasMore: totalCount > skip + requests.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — Pending / Active / History Lists
// ─────────────────────────────────────────────

const buildHostelFilter = (hostelId, extra = {}) => {
  const filter = { ...extra };
  if (hostelId && hostelId.toUpperCase() !== "ALL") filter.hostelId = hostelId;
  return filter;
};

exports.getPendingRequestsByHostelId = async (req, res) => {
  try {
    const filter = buildHostelFilter(req.params.hostelId, { status: "SUBMITTED", isActive: true });
    const pendingRequests = await Request.find(filter).sort({ createdAt: -1 }).lean();

    if (pendingRequests.length === 0) {
      return res.status(200).json({ pendingRequests: [], images: [] });
    }

    const rollNos = pendingRequests.map((r) => r.rollNo);
    const imageMap = await fetchImagesMap(rollNos, req);

    return res.status(200).json({
      pendingRequests,
      images: rollNos.map((rollNo) => ({ username: rollNo, imagePath: imageMap[rollNo] || null })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

exports.acceptedRequestsByHostelId = async (req, res) => {
  try {
    const filter = buildHostelFilter(req.params.hostelId, { status: "ACCEPTED", isActive: true });
    const acceptedRequests = await Request.find(filter).sort({ createdAt: -1 }).lean();

    if (acceptedRequests.length === 0) {
      return res.status(200).json({ acceptedRequests: [], images: {} });
    }

    const rollNos = acceptedRequests.map((r) => r.rollNo);
    const imageMap = await fetchImagesMap(rollNos, req);

    return res.status(200).json({ acceptedRequests, images: imageMap });
  } catch (error) {
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

exports.getArrivedRequestsBetweenDates = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, type } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required." });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    const filterOptions = {
      arrived: { $ne: null },
      "arrived.time": { $gte: start, $lte: end },
    };

    if (type) {
      filterOptions.type = type.toUpperCase() === 'LEAVES' ? 'LEAVE' : 'PERMISSION';
    }

    const filter = buildHostelFilter(req.params.hostelId, filterOptions);

    const [totalCount, requests] = await Promise.all([
      Request.countDocuments(filter),
      Request.find(filter)
        .select("rollNo name type hostelId arrived accepted status reason date fromTime toTime fromDate toDate submitted")
        .sort({ "arrived.time": -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const rollNos = requests.map(r => r.rollNo);
    const imageMap = await fetchImagesMap(rollNos, req);

    return res.status(200).json({
      requests,
      images: imageMap,
      totalCount,
      hasMore: totalCount > skip + requests.length
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.getAcceptedRequestsBetweenDates = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, type } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Start date and end date are required." });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    const filterOptions = {
      accepted: { $ne: null },
      "accepted.time": { $gte: start, $lte: end },
    };

    if (type) {
      filterOptions.type = type.toUpperCase() === 'LEAVES' ? 'LEAVE' : 'PERMISSION';
    }

    const filter = buildHostelFilter(req.params.hostelId, filterOptions);

    const [totalCount, requests] = await Promise.all([
      Request.countDocuments(filter),
      Request.find(filter)
        .select("rollNo name type hostelId arrived accepted status reason date fromTime toTime fromDate toDate submitted")
        .sort({ "accepted.time": -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const rollNos = requests.map(r => r.rollNo);
    const imageMap = await fetchImagesMap(rollNos, req);

    return res.status(200).json({
      requests,
      images: imageMap,
      totalCount,
      hasMore: totalCount > skip + requests.length
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error." });
  }
};

// ─────────────────────────────────────────────
//  READ — Dashboard Counts
// ─────────────────────────────────────────────

const aggregateTypeCounts = async (matchFilter, req) => {
  // ⚡ Performance: count-only aggregation + separate lean fetch (avoid $$ROOT in group)
  const [total, typeAgg, allRequests] = await Promise.all([
    Request.countDocuments(matchFilter),
    Request.aggregate([
      { $match: matchFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
    Request.find(matchFilter).lean(),
  ]);

  const counts = { total, permission: 0, leave: 0, permissionArray: [], leaveArray: [], images: {} };
  
  const rollNos = allRequests.map(r => r.rollNo);
  const imageMap = await fetchImagesMap(rollNos, req);
  counts.images = imageMap;

  typeAgg.forEach(({ _id, count }) => {
    if (_id === "PERMISSION") counts.permission = count;
    else if (_id === "LEAVE") counts.leave = count;
  });
  allRequests.forEach((r) => {
    if (r.type === "PERMISSION") counts.permissionArray.push(r);
    else if (r.type === "LEAVE") counts.leaveArray.push(r);
  });
  return counts;
};

exports.getTodayRequestCountsByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    if (!hostelId) return res.status(400).json({ message: "hostelId is required." });

    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const counts = await aggregateTypeCounts({
      hostelId,
      createdAt: { $gte: today, $lte: endOfDay },
    }, req);
    return res.status(200).json(counts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getTodayAcceptedByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    if (!hostelId) return res.status(400).json({ message: "hostelId is required." });

    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const counts = await aggregateTypeCounts({
      hostelId,
      "accepted.time": { $gte: today, $lte: endOfDay },
    }, req);
    return res.status(200).json(counts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getTodayArrivedByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    if (!hostelId) return res.status(400).json({ message: "hostelId is required." });

    const today = moment().startOf("day").toDate();
    const endOfDay = moment().endOf("day").toDate();

    const counts = await aggregateTypeCounts({
      hostelId,
      "arrived.time": { $gte: today, $lte: endOfDay },
    }, req);
    return res.status(200).json(counts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  VERIFY (QR Code scan)
// ─────────────────────────────────────────────

exports.verifyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const [request, image] = await Promise.all([
      Request.findById(id).lean(),
      ImageModel.findOne({ username: req.query.rollNo }).select("filename path").lean(),
    ]);

    if (!request) return res.status(404).json({ success: false, message: "Request not found." });

    const hosteler = await Hosteler.findOne({ rollNo: request.rollNo })
      .select("name rollNo branch year")
      .lean();

    if (!hosteler) return res.status(404).json({ success: false, message: "Student not found." });

    return res.status(200).json({
      success: true,
      request,
      student: {
        name: hosteler.name,
        rollNo: hosteler.rollNo,
        branch: hosteler.branch,
        year: hosteler.year,
        profileImage: buildImageUrl(image, req),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE
// ─────────────────────────────────────────────

exports.deleteRequestById = async (req, res) => {
  try {
    // ✅ SECURITY: Only Admins can delete requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Forbidden: Admin privileges required to delete requests." });
    }

    const request = await Request.findByIdAndDelete(req.params.id).lean();
    if (!request) return res.status(404).json({ message: "Request not found." });
    return res.status(200).json({ message: "Request deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteRequestByRollNo = async ({ params }) => {
  try {
    const { rollNo } = params;
    await Request.deleteMany({ rollNo });
  } catch (error) {
    console.error(`Failed to delete requests for ${params.rollNo}:`, error.message);
  }
};
