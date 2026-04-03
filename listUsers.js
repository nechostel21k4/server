const mongoose = require('mongoose');
const HostlerCredentials = require('./models/HostlerCredentials');
require('dotenv').config({ path: './.env' });

async function listUsers() {
    try {
        const uri = process.env.MONGO_URI || "mongodb://0.0.0.0:27017/hostel_db";
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const allUsers = await HostlerCredentials.find({}, 'rollNo faceDescriptor');
        console.log(`Found ${allUsers.length} users.`);

        allUsers.forEach(u => {
            const hasFace = u.faceDescriptor && u.faceDescriptor.length > 0;
            console.log(`- ${u.rollNo}: FaceRegistered=${hasFace} (Len: ${u.faceDescriptor ? u.faceDescriptor.length : 0})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

listUsers();
