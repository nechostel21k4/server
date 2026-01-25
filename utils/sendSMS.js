const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.BULK_SMS_API_KEY;
const username = process.env.BULK_SMS_USERNAME;
const senderId = process.env.BULK_SMS_SENDER_ID;

// Function to send SMS using Bulk SMS API with template ID
const sendSMS = async (phoneNumber, templateId, messageTemplate, variables) => {
  const gender = variables[0];
  const message = messageTemplate
    .replace("{#var1#}", variables[0]) //variables[0]
    .replace("{#var2#}", variables[1])
    .replace("{#var3#}", variables[2])
    .replace("{#var4#}", variables[3])
    .replace("{#var5#}", variables[4])
    .replace("{#var6#}", variables[5]);
  ;
  console.log(variables);
  console.log(message);

  // Construct the URL for the API request
  const url = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(
    username
  )}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(
    senderId
  )}&mobile=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(
    message
  )}&templateid=${encodeURIComponent(templateId)}&type=unicode`;

  try {
    // Make the API request
    const response = await axios.get(url);




    // Check for specific error messages in the response
    if (response.data.includes("error")) {
      console.error("SMS API returned an error:", response.data);
      return {
        success: false,
        message: "SMS API returned an error",
        response: response.data,
      };
    }

    // console.log("SMS Sent Successfully:", response.data);
    return {
      success: true,
      message: "SMS sent successfully",
      response: response.data,
    };
  } catch (error) {
    // Log the error
    console.error("Error sending SMS:", phoneNumber, error);
    return {
      success: false,
      message: "Error sending SMS",
      error: error.message,
    };
  }
};


module.exports = sendSMS;
