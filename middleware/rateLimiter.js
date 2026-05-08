const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Increased from 5: Each login attempt triggers 3 parallel requests (admin/incharge/faculty)
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 OTP requests per hour
  message: { success: false, message: 'Too many OTP requests, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting (higher to support admin dashboards that make many parallel requests)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 500, // Raised from 100: admin portals issue 10-15 parallel requests on page load
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, otpLimiter, apiLimiter };
