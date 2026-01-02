const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/announcementCloudinaryConfig');
const announcementController = require('../controllers/announcementController');

const upload = multer({ storage: storage });

// Create Announcement (Image is optional in code but 'image' field name expected)
router.post('/create', upload.single('image'), announcementController.createAnnouncement);

// Get Announcements
router.get('/get', announcementController.getAnnouncements);

// Update Announcement
router.put('/update/:id', upload.single('image'), announcementController.updateAnnouncement);

// Delete Announcement
router.delete('/delete/:id', announcementController.deleteAnnouncement);

module.exports = router;
