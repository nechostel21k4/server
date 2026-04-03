// config/db.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Cache connection across serverless invocations
let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }
    try {
        const db = await mongoose.connect(process.env.MONGODB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000, // Fail fast if DB is unreachable
            socketTimeoutMS: 45000,
        });
        isConnected = db.connections[0].readyState === 1;
        console.log('MongoDB connection established');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
