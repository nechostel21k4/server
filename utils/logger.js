const Log = require("../models/Logs");

/**
 * Logs an action to the Trace Registry
 * @param {Object} req - Express request object (to extract user info)
 * @param {string} action - Descriptive action string
 * @param {string} [userId] - Optional specific target user ID
 */
const traceAction = async (req, action, userId = null) => {
    try {
        const logEntry = new Log({
            date: new Date(),
            userId: userId || req.user?.eid || req.user?.username || "SYSTEM",
            username: req.user?.eid || req.user?.username || "SYSTEM",
            action: action
        });
        await logEntry.save();
    } catch (error) {
        console.error("Tracing Failure:", error);
    }
};

module.exports = { traceAction };
