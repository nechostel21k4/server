const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.BULK_SMS_API_KEY;
const username = process.env.BULK_SMS_USERNAME;
const senderId = process.env.BULK_SMS_SENDER_ID;

// Function to send SMS using Bulk SMS API with template ID
const sendSMS = async (phoneNumber, templateId, messageTemplate, variables) => {
  // 1. Clean Phone Number: Remove '+', spaces, or dashes
  let cleanPhone = phoneNumber.toString().replace(/[^0-9]/g, '');
  
  // 2. Prepare the message: Support both {#var1#} and positional {#var#} placeholders
  let message = messageTemplate || '';
  
  // Handle {#var1#}, {#var2#}, etc.
  if (message.includes('{#var1#}')) {
    message = message
      .replace("{#var1#}", variables[0] ?? '')
      .replace("{#var2#}", variables[1] ?? '')
      .replace("{#var3#}", variables[2] ?? '')
      .replace("{#var4#}", variables[3] ?? '')
      .replace("{#var5#}", variables[4] ?? '')
      .replace("{#var6#}", variables[5] ?? '');
  } 
  
  // Handle positional {#var#} (common in DLT templates)
  if (message.includes('{#var#}')) {
    for (const variable of variables) {
      message = message.replace('{#var#}', variable ?? '');
    }
  }

  // console.log('SMS Variables:', variables);
  // console.log('SMS Message:', message);

  // 3. Construct the URL for the API request
  const url = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(
    username
  )}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(
    senderId
  )}&mobile=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(
    message
  )}&templateid=${encodeURIComponent(templateId)}&type=unicode`;

  try {
    // Make the API request
    const response = await axios.get(url);

    // 4. Handle Response Safely: Check if string or object
    const responseData = response.data;
    const lowerData = typeof responseData === 'string' ? responseData.toLowerCase() : JSON.stringify(responseData).toLowerCase();

    if (lowerData.includes("error") || lowerData.includes("err") || lowerData.includes("less credits") || lowerData.includes("failure")) {
      const isBalanceError = lowerData.includes("less credits") || lowerData.includes("insufficient");
      console.error("SMS API returned an error:", responseData);
      return {
        success: false,
        message: isBalanceError ? "Insufficient SMS Balance" : "SMS API returned an error: " + JSON.stringify(responseData),
        isBalanceError,
        response: responseData,
      };
    }

    return {
      success: true,
      message: "SMS sent successfully",
      response: responseData,
    };
  } catch (error) {
    // Log the error
    console.error("Error sending SMS to", cleanPhone, ":", error.message);
    return {
      success: false,
      message: "Error sending SMS",
      error: error.message,
    };
  }
};


module.exports = sendSMS;
