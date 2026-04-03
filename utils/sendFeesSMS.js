const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.BULK_SMS_API_KEY;
const username = process.env.BULK_SMS_USERNAME;
const senderId = process.env.BULK_SMS_SENDER_ID;

/**
 * Dedicated function for Fee SMS which uses positional {#var#} placeholders.
 * Variables order: 0:genderWord, 1:year, 2:feeAmountNonAC, 3:feeAmountAC
 */
const sendFeesSMS = async (phoneNumber, templateId, messageTemplate, variables) => {
  let message = messageTemplate;

  // Replace {#var#} positionally (approved DLT template format)
  // Each replace() call replaces only the FIRST occurrence.
  for (const variable of variables) {
    message = message.replace('{#var#}', variable ?? '');
  }

  console.log('Fee SMS Variables:', variables);
  console.log('Fee SMS Message:', message);

  // Construct the URL for the API request
  const url = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(
    username
  )}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(
    senderId
  )}&mobile=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(
    message
  )}&templateid=${encodeURIComponent(templateId)}&type=unicode`;

  try {
    const response = await axios.get(url);

    // Check for specific error messages in the response (case-insensitive)
    const lowerData = response.data.toLowerCase();
    if (lowerData.includes("error") || lowerData.includes("err") || lowerData.includes("less credits")) {
      console.error("Fee SMS API returned an error:", response.data);
      return {
        success: false,
        message: "SMS API returned an error: " + (response.data.includes("less credits") ? "Insufficient Balance" : response.data),
        response: response.data,
      };
    }

    return {
      success: true,
      message: "Fee SMS sent successfully",
      response: response.data,
    };
  } catch (error) {
    console.error("Error sending Fee SMS:", phoneNumber, error);
    return {
      success: false,
      message: "Error sending Fee SMS",
      error: error.message,
    };
  }
};

module.exports = sendFeesSMS;
