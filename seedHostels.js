const mongoose = require('mongoose');
const { Hostel } = require('./models/CollegeBranchHostelSchema');
require('dotenv').config({ path: './.env' });

async function seedHostels() {
    try {
        const uri = process.env.MONGODB_URL;
        if (!uri) throw new Error("MONGODB_URL not found");

        await mongoose.connect(uri);
        console.log('Connected to DB');

        const hostelsToSeed = [
            { code: 'BH1', name: 'Boys Hostel 1' },
            { code: 'GH1', name: 'Girls Hostel 1' }
        ];

        for (const data of hostelsToSeed) {
            const exists = await Hostel.findOne({ code: data.code });
            if (!exists) {
                await Hostel.create(data);
                console.log(`Created Hostel: ${data.code} - ${data.name}`);
            } else {
                console.log(`Hostel already exists: ${data.code}`);
            }
        }

        console.log("Seeding complete.");

    } catch (err) {
        console.error("Error seeding hostels:", err);
    } finally {
        await mongoose.disconnect();
    }
}

seedHostels();
