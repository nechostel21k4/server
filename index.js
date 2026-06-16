require('dotenv').config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const connectDB = require("./config/db");

// Import routes
const uploadRoutes = require("./routes/uploadRoutes");

const adminRoutes = require("./routes/adminRoutes");
const adminLoginRoutes = require("./routes/adminLoginRoutes");

const hostelerRoutes = require("./routes/hostelerRoutes");
const hostlerCredentialsRoutes = require("./routes/hostlerCredentialsRoutes");
const requestsRoutes = require("./routes/requestsRoutes");
const holidayRoutes = require("./routes/holidayMsgRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

const inchargeRoutes = require("./routes/inchargeRoutes");
const InchargeLoginRoutes = require("./routes/inchargeLoginRoutes");
const feesReminderRoutes = require("./routes/feesReminderRoutes");

const logsRoutes = require("./routes/logsRoutes");
const facultyRoutes = require("./routes/facultyRoutes");

const schemasRoutes = require("./routes/CollegeBranchHostelRoutes");
const attendanceRoutes = require("./routes/attendance");

const { default: mongoose } = require("mongoose");

const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .replace(/['"]/g, '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV !== "production") return callback(null, true);
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      const normalizedAllowed = allowedOrigin.replace(/\/$/, "");
      return normalizedAllowed === normalizedOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} not allowed by CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions,
});

app.set("io", io);

// Connect to database
connectDB();

const { apiLimiter } = require("./middleware/rateLimiter");

// 1. Security Headers (Top Priority)
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(self), geolocation=(self), microphone=(), interest-cohort=()");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  next();
});

// 2. Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests explicitly for all routes

app.use(apiLimiter);
app.use(helmet({
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
app.use("/uploads", express.static("uploads"));

// Routes

app.use("/upload", uploadRoutes);
// admins
app.use("/admin", adminRoutes);
app.use("/admin-auth", adminLoginRoutes);
// students
app.use("/student", hostelerRoutes);
app.use("/student-auth", hostlerCredentialsRoutes);
app.use("/requests", requestsRoutes);
app.use("/holiday", holidayRoutes);
app.use("/fees", feesReminderRoutes);
app.use("/complaint", complaintRoutes);


// incharges
app.use("/incharge", inchargeRoutes);
app.use("/incharge-auth", InchargeLoginRoutes);
// logs
app.use("/logs", logsRoutes);
//faculty
app.use("/faculty", facultyRoutes);

// college branch hostel schemas
app.use("/schemas", schemasRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/announcement", require("./routes/announcementRoutes"));
app.use("/marquee", require("./routes/marqueeRoutes"));
app.use("/meal", require("./routes/mealRoutes"));


app.get("/", (req, res) => {
  res.send("hello world");
});

// Keep-alive ping endpoint - hits this to prevent cold starts
app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

// Error handling middleware (Must be last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error occurred' : err.message
  });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} and accessible on network`);
  });
}

const shutdown = async (signal) => {
  console.log("closing.....");
  await mongoose.connection.close();
  console.log("connect close");
  process.exit(0);
};

process.on("SIGINT", () => {
  shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

module.exports = app;
