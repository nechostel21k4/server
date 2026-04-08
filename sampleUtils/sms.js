const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.BULK_SMS_API_KEY;
const username = process.env.BULK_SMS_USERNAME;
const senderId = process.env.BULK_SMS_SENDER_ID;

// Function to send SMS using Bulk SMS API with template ID
const sendSMS = async (phoneNumber, templateId, messageTemplate, variables) => {
    console.log(phoneNumber);
    console.log("sms called")
    console.log(variables)
    console.log(messageTemplate);
    // Remove any leading '+' from the phone number
    if (phoneNumber.startsWith('+')) {
        phoneNumber = phoneNumber.slice(1);
    }

    // Prepare the message by replacing placeholders with actual values
    const message = messageTemplate
        .replace('{#var1#}', variables[0])
        .replace('{#var2#}', variables[1])
        .replace('{#var3#}', variables[2])
        .replace('{#var4#}', variables[3]);

    // Construct the URL for the API request
    const url = `${process.env.BULK_SMS_API_URL}?username=${encodeURIComponent(username)}&apikey=${encodeURIComponent(apiKey)}&senderid=${encodeURIComponent(senderId)}&mobile=${encodeURIComponent(phoneNumber)}&message=${encodeURIComponent(message)}&templateid=${encodeURIComponent(templateId)}`;

    try {
        // Make the API request
        const response = await axios.get(url);

        // Log the full request URL for debugging
        console.log('SMS API Request URL:', url);

        // Log the full response for debugging
        console.log('SMS API Response:', response.data);

        // Check for specific error messages in the response
        if (response.data.includes('error')) {
            console.error('SMS API returned an error:', response.data);
            return { success: false, message: 'SMS API returned an error', response: response.data };
        }

        console.log('SMS Sent Successfully:', response.data);
        return { success: true, message: 'SMS sent successfully', response: response.data };
    } catch (error) {
        // Log the error
        console.error('Error sending SMS:', error);
        return { success: false, message: 'Error sending SMS', error: error.message };
    }
};

module.exports = sendSMS;
