const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');

dotenv.config();

const fixAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");

        const eid = 'admin';

        const existing = await Admin.findOne({ eid });
        if (existing) {
            console.log("Admin record already exists in Admin collection:", existing);
        } else {
            const newAdmin = new Admin({
                name: 'Super Admin',
                eid: eid,
                phoneNo: '0000000000',
                designation: 'Super Admin',
            });
            await newAdmin.save();
            console.log("Admin record created successfully:", newAdmin);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

fixAdmin();
