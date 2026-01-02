const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// Re-use the cloudinary instance configuration if possible, or re-config (safe to re-config usually)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'hostel_announcements',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        public_id: (req, file) => `announcement-${Date.now()}`
    },
});

module.exports = { storage };
