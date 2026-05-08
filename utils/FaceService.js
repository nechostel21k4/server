const faceapi = require('face-api.js');
const { Canvas, Image, ImageData, loadImage } = require('canvas');
const path = require('path');

// Configure face-api
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const weightsPath = path.join(__dirname, '../weights');
let modelsLoaded = false;

// Load models
const loadModels = async () => {
    if (modelsLoaded) return;
    try {
        console.log("Loading FaceAPI local models...");
        await faceapi.nets.ssdMobilenetv1.loadFromDisk(weightsPath);
        await faceapi.nets.faceLandmark68Net.loadFromDisk(weightsPath);
        await faceapi.nets.faceRecognitionNet.loadFromDisk(weightsPath);
        modelsLoaded = true;
        console.log("FaceAPI models loaded.");
    } catch (error) {
        console.error("FAILED to load FaceAPI models:", error);
    }
};

/**
 * Get descriptor from image buffer.
 * @param {Buffer} imageBuffer 
 */
const getFaceDescriptor = async (imageBuffer) => {
    await loadModels();
    try {
        const img = await loadImage(imageBuffer);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detection) {
            return null; // No face detected
        }
        return detection.descriptor; // Float32Array
    } catch (err) {
        console.error("Error in getFaceDescriptor:", err);
        throw err;
    }
};

/**
 * Compare two face descriptors.
 * @param {Float32Array | number[]} storedDescriptor 
 * @param {Float32Array | number[]} currentDescriptor 
 * @returns {Object} { isMatch: boolean, score: number }
 */
const isFaceMatch = (storedDescriptor, currentDescriptor) => {
    const distance = faceapi.euclideanDistance(storedDescriptor, currentDescriptor);
    // FaceAPI: Distance < 0.6 is usually a match. Lower is better.
    // Convert distance to a "score" or "confidence" (inverted). 
    // Example: 0.0 -> 100%, 0.6 -> 50%? 
    // Let's just return distance and a boolean.
    const threshold = 0.5; // Stricter threshold for security
    const isMatch = distance < threshold;
    return { isMatch, distance };
};

module.exports = {
    loadModels,
    getFaceDescriptor,
    isFaceMatch
};
