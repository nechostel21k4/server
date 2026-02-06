const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

/**
 * Send Push Notification via OneSignal
 * @param {Array} userIds - Array of external user IDs (Roll Numbers) to target
 * @param {String} title - Notification Title
 * @param {String} message - Notification Message
 * @param {Object} data - Additional data to send with notification (optional)
 * @param {Array} segments - Array of segments to target (optional, e.g., ["All", "Active Users"])
 */
const sendNotification = async (userIds, title, message, data = {}, segments = []) => {
    try {
        const headers = {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Basic ${ONESIGNAL_API_KEY}`
        };

        const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: title },
            contents: { en: message },
            data: data
        };

        if (userIds && userIds.length > 0) {
            payload.include_external_user_ids = userIds; // Target specific users
        } else if (segments && segments.length > 0) {
            payload.included_segments = segments; // Target segments
        } else {
            console.log("No recipients specified for notification.");
            return;
        }

        const response = await axios.post("https://onesignal.com/api/v1/notifications", payload, { headers });
        console.log("Notification sent successfully:", response.data);
        return response.data;

    } catch (error) {
        console.error("Error sending notification:", error.response ? error.response.data : error.message);
        // Don't throw error to prevent blocking main flow
    }
};

module.exports = sendNotification;
