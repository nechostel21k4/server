const mongoose = require('mongoose');
const { ImageModel } = require('./models/ProfileImage'); // Adjust path as needed
const connectDB = require('./config/db');
require('dotenv').config();

const debugImages = async () => {
    await connectDB();
    const images = await ImageModel.find({});
    console.log("Total Images:", images.length);
    if (images.length > 0) {
        console.log("Sample Image:", JSON.stringify(images[0], null, 2));
        images.forEach(img => {
            console.log(`User: ${img.username}, Path: ${img.path}, StartsWithHttp: ${img.path && img.path.startsWith('http')}`);
        });
    }
    process.exit();
};

debugImages();
