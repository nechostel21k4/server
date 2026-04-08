const Announcement = require('../models/Announcement');
const cloudinary = require('cloudinary').v2;

// Create Announcement
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, description, hostelId, type, author } = req.body;
        let imageUrl = '';

        if (req.file) {
            imageUrl = req.file.path; // Cloudinary storage returns the URL in path
        }

        const newAnnouncement = new Announcement({
            title,
            description,
            imageUrl,
            hostelId: hostelId || null,
            type,
            author
        });

        await newAnnouncement.save();

        res.status(201).json({ success: true, message: 'Announcement created successfully', announcement: newAnnouncement });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ success: false, message: 'Failed to create announcement', error: error.message });
    }
};

// Get Announcements
exports.getAnnouncements = async (req, res) => {
    try {
        const { hostelId } = req.query;
        let filter = {};

        // If hostelId is provided, fetch announcements for that hostel OR global (null/empty hostelId)
        if (hostelId) {
            const isBoy = hostelId.toUpperCase().startsWith('BH');
            const isGirl = hostelId.toUpperCase().startsWith('GH');
            const category = isBoy ? 'BH' : (isGirl ? 'GH' : null);

            filter = {
                $or: [
                    { hostelId: hostelId }, // Specific to their hostel (e.g., BH1)
                    { hostelId: null },     // Global
                    { hostelId: "" },       // Global
                    { hostelId: "ALL" }     // Global Explicit
                ]
            };

            // If it's a known category, include that too
            if (category) {
                filter.$or.push({ hostelId: category });
            }
        }
        // If no hostelId is provided (e.g., Admin viewing all), maybe return all? 
        // Or if the request is generic, return everything.

        // Sort by date descending
        const announcements = await Announcement.find(filter).sort({ date: -1 });

        res.status(200).json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
    }
};

// Update Announcement
exports.updateAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, hostelId } = req.body;
        let updateData = { title, description };

        if (hostelId !== undefined) {
            updateData.hostelId = hostelId || null;
        }

        if (req.file) {
            updateData.imageUrl = req.file.path;
        }

        const updatedAnnouncement = await Announcement.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedAnnouncement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' });
        }

        res.status(200).json({ success: true, message: 'Announcement updated successfully', announcement: updatedAnnouncement });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ success: false, message: 'Failed to update announcement', error: error.message });
    }
};

// Delete Announcement (Optional but good to have)
exports.deleteAnnouncement = async (req, res) => {
    try {
        const { id } = req.params;
        const announcement = await Announcement.findById(id);

        if (!announcement) {
            return res.status(404).json({ success: false, message: 'Announcement not found' });
        }

        // TODO: Delete image from cloudinary if needed

        await Announcement.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete announcement' });
    }
};
