const Marquee = require('../models/Marquee');

exports.getMarquee = async (req, res) => {
    try {
        const marquee = await Marquee.findOne();
        if (!marquee) {
            // Return default
            return res.status(200).json({ text: "Welcome to Hostel Portal", isEnabled: false });
        }
        res.status(200).json(marquee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateMarquee = async (req, res) => {
    try {
        const { text, isEnabled } = req.body;
        // Upsert: update if exists, insert if not
        const marquee = await Marquee.findOneAndUpdate(
            {},
            { text, isEnabled, lastUpdated: Date.now() },
            { new: true, upsert: true }
        );
        res.status(200).json(marquee);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
