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
  // 1. Clean Phone Number: Remove '+', spaces, or dashes
  let cleanPhone = phoneNumber.toString().replace(/[^0-9]/g, '');

  let message = messageTemplate;

  // Replace {#var#} positionally (approved DLT template format)
  // Each replace() call replaces only the FIRST occurrence.
  for (const variable of variables) {
    message = message.replace('{#var#}', variable ?? '');
  }

  // console.log('Fee SMS Variables:', variables);
  // console.log('Fee SMS Message:', message);

  // 2. Construct the URL for the API request
  const url = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(
    username
  )}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(
    senderId
  )}&mobile=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(
    message
  )}&templateid=${encodeURIComponent(templateId)}&type=unicode`;

  try {
    const response = await axios.get(url);

    // 3. Handle Response Safely: Check if string or object
    const responseData = response.data;
    const lowerData = typeof responseData === 'string' ? responseData.toLowerCase() : JSON.stringify(responseData).toLowerCase();

    if (lowerData.includes("error") || lowerData.includes("err") || lowerData.includes("less credits") || lowerData.includes("failure")) {
      const isBalanceError = lowerData.includes("less credits") || lowerData.includes("insufficient");
      console.error("Fee SMS API returned an error:", responseData);
      return {
        success: false,
        message: isBalanceError ? "Insufficient SMS Balance" : "SMS API returned an error: " + JSON.stringify(responseData),
        isBalanceError,
        response: responseData,
      };
    }

    return {
      success: true,
      message: "Fee SMS sent successfully",
      response: responseData,
    };
  } catch (error) {
    console.error("Error sending Fee SMS to", cleanPhone, ":", error.message);
    return {
      success: false,
      message: "Error sending Fee SMS",
      error: error.message,
    };
  }
};

module.exports = sendFeesSMS;
