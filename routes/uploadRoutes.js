const express = require('express');
const multer = require('multer');
const { addHostelers, uploadImage } = require('../controllers/uploadController');
const { authenticateUser, isAdmin } = require('../middleware/auth');
const { getImageByUsername } = require('../controllers/imageController');
const { storage } = require('../config/cloudinaryConfig');

const router = express.Router();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Route to handle file upload
router.post('/addStudents', authenticateUser, isAdmin, addHostelers); 

// Route to image upload
router.post("/uploadimage/:username", authenticateUser, upload.single('image'), uploadImage);

router.get("/getImage/:username", authenticateUser, getImageByUsername);

module.exports = router;
