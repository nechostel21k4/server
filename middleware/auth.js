const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
  }
};

const isIncharge = (req, res, next) => {
  if (req.user && (req.user.role === 'incharge' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Incharge or Admin privileges required." });
  }
};

const isFaculty = (req, res, next) => {
  if (req.user && (req.user.role === 'faculty' || req.user.role === 'incharge' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Faculty or higher privileges required." });
  }
};

const isStudent = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied. Student privileges required." });
  }
};

module.exports = { authenticateUser, isAdmin, isIncharge, isFaculty, isStudent };
