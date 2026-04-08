const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
];

const baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const weightsDir = path.join(__dirname, 'weights');

const downloadFile = (file) => {
    const url = `${baseUrl}/${file}`;
    const filePath = path.join(weightsDir, file);
    const fileStream = fs.createWriteStream(filePath);

    https.get(url, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        fs.unlink(filePath, () => { }); // Delete the file async. (But we don't check for this)
        console.error(`Error downloading ${file}: ${err.message}`);
    });
};

models.forEach(model => {
    downloadFile(model);
});
