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
            maxPoolSize: 20,           // Increased from 10: handle more concurrent admin queries
            minPoolSize: 5,            // Keep warm connections to avoid reconnection latency
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            heartbeatFrequencyMS: 10000, // Detect stale connections faster
        });
        isConnected = db.connections[0].readyState === 1;
        console.log('MongoDB connection established');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
