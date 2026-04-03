const mongoose = require('mongoose');
const HostlerCredentials = require('./models/HostlerCredentials');
require('dotenv').config({ path: './.env' }); // Explicit path

const rollNo = '22471A05M6'; // The user from your logs

async function checkUser() {
    try {
        const uri = process.env.MONGODB_URL; // Correct Env Var
        if (!uri) throw new Error("MONGODB_URL not found in .env");

        await mongoose.connect(uri);
        console.log('Connected to DB');

        const creds = await HostlerCredentials.findOne({ rollNo });
        if (creds) {
            console.log(`User found: ${creds.rollNo}`);
            console.log(`Face Descriptor Length: ${creds.faceDescriptor ? creds.faceDescriptor.length : 'NULL'}`);
            console.log(`Is Registered (Length > 100): ${creds.faceDescriptor && creds.faceDescriptor.length > 100}`);
        } else {
            console.log('User not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
