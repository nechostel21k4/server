const express = require('express');
const multer = require('multer');
const path = require('path');
const { addHostelers,uploadImage } = require('../controllers/uploadController');
const authenticateUser = require('../middleware/auth');
const { getImageByUsername } = require('../controllers/imageController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, 'file-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Route to handle file upload
router.post('/addStudents',authenticateUser ,addHostelers ); //upload array of students details

// Route to image upload
router.post("/uploadimage/:username",upload.single('image'),uploadImage);

router.get("/getImage/:username",getImageByUsername);

module.exports = router;
