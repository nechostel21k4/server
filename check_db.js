const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Hosteler = require('./models/Hostelers');

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
    await mongoose.connect(process.env.MONGODB_URL);
    const count = await Hosteler.countDocuments();
    const hostels = await Hosteler.distinct('hostelId');
    console.log(`Total Hostelers: ${count}`);
    console.log(`Hostel IDs: ${hostels.join(', ')}`);
    process.exit(0);
}

check();
