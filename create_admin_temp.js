const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const AdminLogin = require('./models/AdminLogin');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");

        const eid = 'admin'; // Configuration: Default admin username
        const password = 'password123'; // Configuration: Default admin password

        // Check if admin exists
        const existingAdmin = await AdminLogin.findOne({ eid });

        let hashedPassword = await bcrypt.hash(password, 10);

        if (existingAdmin) {
            console.log("Admin exists, updating password...");
            existingAdmin.password = hashedPassword;
            await existingAdmin.save();
            console.log(`Admin password updated. Login with User: ${eid}, Pass: ${password}`);
        } else {
            console.log("Creating new admin...");
            const newAdmin = new AdminLogin({
                eid,
                password: hashedPassword
            });
            await newAdmin.save();
            console.log(`Admin created. Login with User: ${eid}, Pass: ${password}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

createAdmin();
