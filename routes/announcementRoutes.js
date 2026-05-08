const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/announcementCloudinaryConfig');
const announcementController = require('../controllers/announcementController');
const { authenticateUser, isIncharge } = require('../middleware/auth');

const upload = multer({ storage: storage });

// Create Announcement (Image is optional in code but 'image' field name expected)
router.post('/create', authenticateUser, isIncharge, upload.single('image'), announcementController.createAnnouncement);

// Get Announcements (Public)
router.get('/get', announcementController.getAnnouncements);

// Update Announcement
router.put('/update/:id', authenticateUser, isIncharge, upload.single('image'), announcementController.updateAnnouncement);

// Delete Announcement
router.delete('/delete/:id', authenticateUser, isIncharge, announcementController.deleteAnnouncement);

module.exports = router;
