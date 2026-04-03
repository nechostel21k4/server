const mongoose = require('mongoose');
const { ImageModel } = require('./models/ProfileImage');
const connectDB = require('./config/db');
require('dotenv').config();

const debugImages = async () => {
    await connectDB();
    const localImages = await ImageModel.find({ path: { $not: /^http/ } });
    console.log("Images with local paths:", localImages.length);
    if (localImages.length > 0) {
        console.log("Sample Local Image:", JSON.stringify(localImages[0], null, 2));
    }
    process.exit();
};

debugImages();
