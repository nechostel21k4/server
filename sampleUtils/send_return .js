const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.BULK_SMS_API_KEY;
const username = process.env.BULK_SMS_USERNAME;
const senderId = process.env.BULK_SMS_SENDER_ID;
const return_id = process.env.RETURN_TEMPLATE_ID;

// Function to send return SMS
const send_return = async (phoneNumber, messageTemplate, variables) => {
    console.log(return_id)
    console.log(phoneNumber)
    console.log("Variables are as follows:", variables);
    console.log("Message template is as follows:", messageTemplate);

    // Remove any leading '+' from the phone number
    if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.slice(1);
    }

    // Prepare the message by replacing placeholders with actual values
    const message = messageTemplate
        .replace("{#var1#}", variables[0])
        .replace("{#var2#}", variables[1]);

    // Construct the URL for the API request
    const smsUrl = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(username)}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(senderId)}&mobile=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(message)}&templateid=${encodeURIComponent(return_id)}`;
    console.log("return msg");
    console.log(`Sending SMS using URL: ${smsUrl}`);

    try {
        // Make the API request
        const response = await axios.get(smsUrl);

        // Log the full request URL for debugging
        console.log('SMS API Request URL:', smsUrl);

        // Log the full response for debugging
        console.log("return msg");

        console.log('SMS sent successfully:', response.data);

        // Check for specific error messages in the response
        if (response.data.includes('error')) {
            console.error('SMS API returned an error:', response.data);
            return { success: false, message: 'SMS API returned an error', response: response.data };
        }

        return { success: true, message: 'SMS sent successfully', response: response.data };
    } catch (error) {
        // Log the error
        console.error('Error sending SMS:', error);
        return { success: false, message: 'Error sending SMS', error: error.message };
    }
};

module.exports = send_return;
