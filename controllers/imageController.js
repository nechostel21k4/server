const { ImageModel } = require("../models/ProfileImage");
const path = require("path");


exports.getImageByUsername = async (req, res) => {
    try {
        const image = await ImageModel.findOne({ username: req.params.username });
        if (!image) {
            return res.json({ imageExist: false, message: 'Image not found' });
        }

        let imagePath;
        if (image.path && image.path.startsWith('http')) {
            imagePath = image.path;
        } else {
            imagePath = `${process.env.IP}/uploads/${image.filename}`;
        }

        res.json({ imageExist: true, imagePath: imagePath });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}