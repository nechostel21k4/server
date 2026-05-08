const Hosteler = require("../models/Hostelers");
const HostlerCredentials = require("../models/HostlerCredentials");
const Incharge = require("../models/Incharge");
const Faculty = require("../models/Faculty");
const Request = require("../models/Requests");
const { ImageModel } = require("../models/ProfileImage");
const { forgotPassword } = require("./hostlerCredentialsController");
const { deleteHostler } = require("./hostlerCredentialsController");

// ─────────────────────────────────────────────
//  SHARED HELPERS
// ─────────────────────────────────────────────

/** Builds an image URL from the db record and the request context */
const buildImageUrl = (img, req) => {
  if (!img) return null;
  if (img.path && img.path.startsWith("http")) return img.path;
  return `${req.protocol}://${req.get("host")}/uploads/${img.filename}`;
};

/** Validates whether a student's lastRequest-based status is still active */
const resolveCurrentStatus = (hostelerObj) => {
  const { currentStatus, lastRequest } = hostelerObj;

  if (!lastRequest || !["LEAVE", "PERMISSION"].includes(currentStatus)) {
    return currentStatus;
  }

  const now = new Date();

  if (currentStatus === "LEAVE" && lastRequest.fromDate && lastRequest.toDate) {
    const isActive = now >= new Date(lastRequest.fromDate) && now <= new Date(lastRequest.toDate);
    return isActive ? "LEAVE" : "HOSTEL";
  }

  if (currentStatus === "PERMISSION" && lastRequest.fromTime && lastRequest.toTime) {
    const isActive = now >= new Date(lastRequest.fromTime) && now <= new Date(lastRequest.toTime);
    return isActive ? "PERMISSION" : "HOSTEL";
  }

  return "HOSTEL";
};

/** Builds a filter object from request body; ignores "ALL" values */
const buildFilter = ({ hostelId, college, year, branch } = {}) => {
  const filter = {};
  if (hostelId && hostelId.toUpperCase() !== "ALL") filter.hostelId = hostelId.toUpperCase();
  if (college && college.toUpperCase() !== "ALL") filter.college = college.toUpperCase();
  if (year && year.toString().toUpperCase() !== "ALL") filter.year = parseInt(year, 10);
  if (branch && branch.toUpperCase() !== "ALL") filter.branch = branch.toUpperCase();
  return filter;
};

/** Fetches and maps profile images for a list of roll numbers */
const fetchImages = async (rollNos, req) => {
  const images = await ImageModel.find({ username: { $in: rollNos } }).select("username filename path").lean();
  const imageMap = {};
  images.forEach((img) => {
    imageMap[img.username] = buildImageUrl(img, req);
  });
  return imageMap;
};

/** Standardizes student data (e.g., gender aliases, numeric types) */
const sanitizeHosteler = (hosteler) => {
  if (!hosteler) return hosteler;
  
  // Normalize Gender
  if (hosteler.gender) {
    const g = hosteler.gender.toUpperCase();
    if (g === 'BOYS') hosteler.gender = 'MALE';
    else if (g === 'GIRLS') hosteler.gender = 'FEMALE';
    else hosteler.gender = g;
  }

  // Ensure Year is a number (if it comes as string from somewhere)
  if (hosteler.year && typeof hosteler.year === 'string') {
    hosteler.year = parseInt(hosteler.year, 10);
  }

  return hosteler;
};

// ─────────────────────────────────────────────
//  CREATE
// ─────────────────────────────────────────────

exports.createHosteler = async (req, res) => {
  try {
    const { rollNo } = req.body;

    const exists = await Hosteler.findOne({ rollNo }).lean();
    if (exists) {
      return res.status(409).json({ success: false, isExisted: true, message: `Student ${rollNo} already exists.` });
    }

    await Hosteler.create(req.body);
    return res.status(201).json({ success: true, isExisted: false, message: "Student added successfully." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to add student.", error: error.message });
  }
};

// ─────────────────────────────────────────────
//  VERIFY (password reset / registration checks)
// ─────────────────────────────────────────────

exports.verifyStudent = async (req, res) => {
  try {
    const hosteler = await Hosteler.findOne({ rollNo: req.params.RollNo }).lean();
    if (!hosteler) {
      return res.status(404).json({ isExist: false, message: "Student not found." });
    }

    const { phoneNo } = await forgotPassword(hosteler);
    const maskedPhone = phoneNo ? `XXXXXX${phoneNo.slice(-4)}` : 'N/A';
    return res.status(200).json({ isExist: true, phoneNo: maskedPhone, message: "OTP sent successfully." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.verifyRegisterStudent = async (req, res) => {
  try {
    const { RollNo } = req.params;
    const hosteler = await Hosteler.findOne({ rollNo: RollNo }).lean();

    if (!hosteler) {
      return res.status(404).json({ isExist: false, isRegistered: false, message: "Student not found." });
    }

    const creds = await HostlerCredentials.findOne({ rollNo: RollNo }).lean();
    if (hosteler.lastRequest || creds) {
      return res.status(200).json({ isExist: true, isRegistered: true, message: "Student already registered." });
    }

    // Mask sensitive details but return enough for UI to show student name
    const safeHosteler = {
      name: hosteler.name,
      rollNo: hosteler.rollNo,
      college: hosteler.college,
      branch: hosteler.branch,
      year: hosteler.year,
      hostelId: hosteler.hostelId
    };

    return res.status(200).json({ isExist: true, isRegistered: false, hosteler: safeHosteler });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — Single Student
// ─────────────────────────────────────────────

exports.getHostelerByRollNo = async (req, res) => {
  try {
    const { RollNo } = req.params;

    // ✅ SECURITY: Students can only view their own profile
    if (req.user.role === 'student' && req.user.rollNo !== RollNo) {
      return res.status(403).json({ success: false, message: "Forbidden: You can only view your own profile." });
    }

    const [hosteler, creds, imgProfile] = await Promise.all([
      Hosteler.findOne({ rollNo: RollNo }).lean(),
      HostlerCredentials.findOne({ rollNo: RollNo }).select("faceDescriptor").lean(),
      ImageModel.findOne({ username: RollNo }).select("filename path").lean(),
    ]);

    if (!hosteler) {
      return res.status(404).json({ isExist: false, message: "Student not found." });
    }

    const resolvedStatus = resolveCurrentStatus(hosteler);

    // Auto-correct stale status in DB without blocking the response
    if (resolvedStatus !== hosteler.currentStatus) {
      Hosteler.updateOne({ rollNo: RollNo }, { currentStatus: "HOSTEL" }).exec();
      hosteler.currentStatus = "HOSTEL";
    }

    hosteler.isRegistered = !!(creds?.faceDescriptor?.length > 0);
    hosteler.profilePic = buildImageUrl(imgProfile, req);
    sanitizeHosteler(hosteler);

    return res.status(200).json({ isExist: true, hosteler });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — Search
// ─────────────────────────────────────────────

exports.searchHosteler = async (req, res) => {
  try {
    const key = req.params.key?.trim();
    if (!key) return res.status(400).json({ isExist: false, message: "Search key is required." });

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const nameRegex = new RegExp(escapedKey, "i");

    // Use aggregation to find student and join profile pic in one trip
    const results = await Hosteler.aggregate([
      {
        $match: {
          $or: [
            { rollNo: key.toUpperCase() },
            { name: { $regex: nameRegex } }
          ]
        }
      },
      { $limit: 1 },
      {
        $lookup: {
          from: 'images',
          localField: 'rollNo',
          foreignField: 'username',
          as: 'profilePicInfo'
        }
      },
      {
        $lookup: {
          from: 'hostlercredentials',
          localField: 'rollNo',
          foreignField: 'rollNo',
          as: 'creds'
        }
      },
      {
        $project: {
          rollNo: 1, name: 1, college: 1, year: 1, branch: 1, hostelId: 1,
          phoneNo: 1, parentPhoneNo: 1, parentName: 1, roomNo: 1, currentStatus: 1, gender: 1,
          isRegistered: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: [{ $arrayElemAt: ['$creds.faceDescriptor', 0] }, []] } }, 0] },
              then: true,
              else: false
            }
          },
          profilePic: { $arrayElemAt: ['$profilePicInfo', 0] }
        }
      }
    ]);

    if (!results || results.length === 0) {
      return res.status(404).json({ isExist: false, message: "Student not found." });
    }

    const hosteler = sanitizeHosteler(results[0]);
    hosteler.profilePic = buildImageUrl(hosteler.profilePic, req);

    // ✅ SECURITY: Incharge/Faculty can only search students within their residency module
    if (req.user.role === 'incharge' || req.user.role === 'faculty') {
      const Model = req.user.role === 'incharge' ? Incharge : Faculty;
      const userProfile = await Model.findOne({ eid: req.user.eid }).select('hostelId').lean();
      
      if (userProfile && userProfile.hostelId !== 'ALL' && hosteler.hostelId !== userProfile.hostelId) {
        return res.status(403).json({ isExist: false, message: "Forbidden: Student belongs to another residency module." });
      }
    }

    return res.status(200).json({ isExist: true, hosteler });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — Autocomplete Suggestions
// ─────────────────────────────────────────────

exports.getStudentSuggestions = async (req, res) => {
  try {
    const key = req.params.key?.trim();
    if (!key) return res.status(200).json([]);

    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedKey, "i");

    // ✅ PERFORMANCE: Limit search to indexed fields and apply limit
    const suggestions = await Hosteler.find({
      $or: [{ rollNo: { $regex: regex } }, { name: { $regex: regex } }],
    })
      .select("name rollNo hostelId")
      .limit(10)
      .lean();

    // ✅ SECURITY: Filter suggestions to only include students in the same hostel for Incharge/Faculty
    let filteredSuggestions = suggestions;
    if (req.user.role === 'incharge' || req.user.role === 'faculty') {
      const Model = req.user.role === 'incharge' ? Incharge : Faculty;
      const userProfile = await Model.findOne({ eid: req.user.eid }).select('hostelId').lean();
      
      if (userProfile && userProfile.hostelId !== 'ALL') {
        filteredSuggestions = suggestions.filter(s => s.hostelId === userProfile.hostelId);
      }
    }

    return res.status(200).json(filteredSuggestions.map(({ name, rollNo }) => ({ name, rollNo })));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — Paginated List
// ─────────────────────────────────────────────

exports.getFilteredHostlers = async (req, res) => {
  try {
    const { page = 1, limit = 20, ...filterInputs } = req.body;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = buildFilter(filterInputs);

    const [totalCount, hostlers] = await Promise.all([
      Hosteler.countDocuments(filter),
      Hosteler.aggregate([
        { $match: filter },
        { $sort: { rollNo: 1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'images',
            localField: 'rollNo',
            foreignField: 'username',
            as: 'img'
          }
        },
        {
          $project: {
            rollNo: 1, name: 1, college: 1, year: 1, branch: 1, hostelId: 1,
            roomNo: 1, currentStatus: 1, gender: 1, parentName: 1, parentPhoneNo: 1, phoneNo: 1,
            imagePath: { $arrayElemAt: ['$img', 0] }
          }
        }
      ])
    ]);

    const formattedHostlers = hostlers.map(h => {
      const img = h.imagePath;
      return sanitizeHosteler({
        ...h,
        imagePath: buildImageUrl(img, req)
      });
    });

    return res.status(200).json({
      hostlers: formattedHostlers,
      images: formattedHostlers.map(h => ({ username: h.rollNo, imagePath: h.imagePath })),
      totalCount,
      page: pageNum,
      hasMore: totalCount > skip + hostlers.length,
    });
  } catch (error) {
    console.error("Filter Hostlers Error:", error);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────
//  READ — Counts
// ─────────────────────────────────────────────

/** Aggregates student counts accurately by cross-referencing valid requests */
const aggregateStatusCounts = async (matchFilter) => {
    const now = new Date();
    const [total, leaveCount] = await Promise.all([
        Hosteler.countDocuments(matchFilter),
        Request.countDocuments({
            ...matchFilter,
            type: { $regex: /^LEAVE$/i },
            status: { $in: ["ACCEPTED", "ARRIVED"] },
            "accepted.time": { $lte: now },
            $or: [
                { "arrived.time": { $gt: now } },
                { "arrived.time": { $exists: false } }
            ]
        })
    ]);

    return {
        total,
        hostel: Math.max(0, total - leaveCount),
        leave: leaveCount,
        permission: 0 
    };
};

exports.getHostelerCountsByHostelId = async (req, res) => {
  try {
    const { hostelId } = req.params;
    if (!hostelId) return res.status(400).json({ message: "hostelId is required." });

    const counts = await aggregateStatusCounts({ hostelId });
    return res.status(200).json(counts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getHostelerCountsByCollege = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { College } = require("../models/CollegeBranchHostelSchema");

    const [allColleges, hostelerCounts] = await Promise.all([
      College.find().lean(),
      Hosteler.aggregate([
        { $match: { hostelId } },
        { $group: { _id: { college: "$college", year: "$year" }, count: { $sum: 1 } } },
        { $group: { _id: "$_id.college", years: { $push: { year: "$_id.year", count: "$count" } } } },
      ]),
    ]);

    const romanNumerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

    // Initialize all colleges from schema
    const counts = {};
    allColleges.forEach((c) => {
      const numYears = c.years || 4;
      counts[c.code] = {};
      for (let i = 1; i <= numYears; i++) {
        counts[c.code][`${romanNumerals[i - 1] || i}Year`] = 0;
      }
    });

    // Fill in actual data
    hostelerCounts.forEach(({ _id: collegeCode, years }) => {
      if (!counts[collegeCode]) counts[collegeCode] = {};
      years.forEach(({ year, count }) => {
        counts[collegeCode][`${romanNumerals[year - 1] || year}Year`] = count;
      });
    });

    return res.status(200).json(counts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ — By Room
// ─────────────────────────────────────────────

exports.getHostelersByRoomNo = async (req, res) => {
  try {
    const { hostelId, roomNo } = req.body;
    if (!hostelId || !roomNo) {
      return res.status(400).json({ message: "hostelId and roomNo are required." });
    }

    const hostlers = await Hosteler.find({ roomNo, hostelId }).lean();
    if (hostlers.length === 0) {
      return res.status(200).json({ hostlers: [], images: [] });
    }

    const rollNos = hostlers.map((s) => s.rollNo);
    const imageMap = await fetchImages(rollNos, req);

    return res.status(200).json({
      hostlers,
      images: rollNos.map((rollNo) => ({ username: rollNo, imagePath: imageMap[rollNo] || null })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getMyRoomies = async (req, res) => {
  try {
    const { hostelId, roomNo } = req.body;
    if (!hostelId || !roomNo) {
      return res.status(400).json({ message: "hostelId and roomNo are required." });
    }

    // ✅ SECURITY: Enforce that students can only fetch their own room's data
    if (req.user && req.user.role === 'student') {
      const self = await Hosteler.findOne({ rollNo: req.user.rollNo }).lean();
      if (!self || self.hostelId !== hostelId || self.roomNo !== roomNo) {
        return res.status(403).json({ message: "Forbidden: You can only view your own roommates." });
      }
    }

    const hostlers = await Hosteler.find(
      { roomNo, hostelId },
      { rollNo: 1, name: 1, college: 1, year: 1, branch: 1, currentStatus: 1, lastRequest: 1 }
    ).lean();

    const now = new Date();
    const sanitized = hostlers.map((h) => {
      const status = resolveCurrentStatus(h);
      const { lastRequest, ...safe } = h; // strip lastRequest from response
      return { ...safe, currentStatus: status };
    });

    const rollNos = sanitized.map((s) => s.rollNo);
    const imageMap = await fetchImages(rollNos, req);

    return res.status(200).json({
      hostlers: sanitized,
      images: rollNos.map((rollNo) => ({ username: rollNo, imagePath: imageMap[rollNo] || null })),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
//  UPDATE
// ─────────────────────────────────────────────

exports.updateHostelerByRollNo = async (req, res) => {
  try {
    // ✅ SECURITY: Only Faculty or Admins can update student profiles
    if (req.user.role === 'student') {
      return res.status(403).json({ success: false, message: "Forbidden: Students cannot update profiles." });
    }

    // Strip out any null/undefined fields to avoid overwriting valid data
    const updateFields = Object.fromEntries(
      Object.entries(req.body).filter(([, v]) => v !== null && v !== undefined)
    );

    const hosteler = await Hosteler.findOneAndUpdate(
      { rollNo: req.params.RollNo },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!hosteler) return res.status(404).json({ message: "Student not found." });

    return res.status(200).json({ updated: true, data: hosteler });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateFilteredHostlers = async (req, res) => {
  try {
    const { rollNumbers, year } = req.body;

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ isUpdated: false, message: "Provide a non-empty array of roll numbers." });
    }
    if (!year || isNaN(parseInt(year, 10))) {
      return res.status(400).json({ isUpdated: false, message: "Provide a valid year." });
    }

    const result = await Hosteler.updateMany(
      { rollNo: { $in: rollNumbers } },
      { $set: { year: parseInt(year, 10) } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ isUpdated: false, message: "No matching students found." });
    }

    return res.status(200).json({
      isUpdated: true,
      message: `${result.modifiedCount} student(s) updated to Year ${year}.`,
    });
  } catch (error) {
    return res.status(500).json({ isUpdated: false, message: "Server error. Please try again." });
  }
};

exports.createRequestAndUpdateStudent = async (req, res) => {
  try {
    const { student, lastRequest } = req.body;
    const { RollNo } = req.params;

    // ✅ SECURITY: Students can only create requests for themselves (IDOR prevention)
    if (req.user.role === 'student' && req.user.rollNo !== RollNo) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only submit requests for your own profile.' });
    }

    const existing = await Hosteler.findOne({ rollNo: RollNo }).lean();

    if (existing?.lastRequest) {
      const prev = existing.lastRequest;
      const now = new Date();

      if (prev.status === "SUBMITTED" && prev.isActive) {
        return res.status(409).json({ success: false, message: "You already have a pending request." });
      }

      if (prev.status === "ACCEPTED" && prev.isActive) {
        const expiry = prev.type === "LEAVE" ? prev.toDate : prev.toTime;
        if (expiry && now <= new Date(expiry)) {
          return res.status(409).json({ success: false, message: "You have an active accepted request." });
        }
      }
    }

    const newRequest = await Request.create(lastRequest);
    const updated = await Hosteler.findOneAndUpdate(
      { rollNo: RollNo },
      { ...student, lastRequest: newRequest },
      { new: true }
    ).lean();

    return res.status(201).json({ success: true, newData: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE
// ─────────────────────────────────────────────

exports.deleteHostelerByRollNo = async (req, res) => {
  try {
    const { RollNo } = req.params;

    const hosteler = await Hosteler.findOneAndDelete({ rollNo: RollNo }).lean();
    if (!hosteler) return res.status(404).json({ deleted: false, message: "Student not found." });

    // Clean up related data in parallel
    await Promise.all([
      Request.deleteMany({ rollNo: RollNo }),
      deleteHostler({ params: { rollNo: RollNo } }),
    ]);

    return res.status(200).json({ deleted: true, message: "Student deleted successfully." });
  } catch (error) {
    return res.status(500).json({ deleted: false, message: error.message });
  }
};

exports.deleteFilteredHostlers = async (req, res) => {
  try {
    const { rollNumbers } = req.body;

    if (!Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ isDeleted: false, message: "Provide a non-empty array of roll numbers." });
    }

    const found = await Hosteler.find({ rollNo: { $in: rollNumbers } }).select("rollNo").lean();
    if (found.length === 0) {
      return res.status(404).json({ isDeleted: false, message: "No matching students found." });
    }

    const rollNos = found.map((h) => h.rollNo);

    // Delete all related data in parallel batches
    await Promise.all([
      Hosteler.deleteMany({ rollNo: { $in: rollNos } }),
      Request.deleteMany({ rollNo: { $in: rollNos } }),
      ...rollNos.map((rollNo) => deleteHostler({ params: { rollNo } })),
    ]);

    return res.status(200).json({ isDeleted: true, message: `${rollNos.length} student(s) deleted.` });
  } catch (error) {
    return res.status(500).json({ isDeleted: false, message: "Server error. Please try again." });
  }
};
