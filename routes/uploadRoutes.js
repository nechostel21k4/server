const express = require('express');
const multer = require('multer');
const { addHostelers, uploadImage } = require('../controllers/uploadController');
const authenticateUser = require('../middleware/auth');
const { getImageByUsername } = require('../controllers/imageController');
const { storage } = require('../config/cloudinaryConfig');

const router = express.Router();

const upload = multer({ storage: storage });

// Route to handle file upload
router.post('/addStudents', authenticateUser, addHostelers); //upload array of students details

// Route to image upload
router.post("/uploadimage/:username", upload.single('image'), uploadImage);

router.get("/getImage/:username", getImageByUsername);

module.exports = router;
