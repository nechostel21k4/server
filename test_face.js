const FaceService = require('./utils/FaceService');
const { createCanvas } = require('canvas');

async function test() {
    try {
        console.log("Loading models...");
        await FaceService.loadModels();
        
        console.log("Creating dummy image...");
        const canvas = createCanvas(640, 640);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 640, 640);
        const buffer = canvas.toBuffer('image/jpeg');

        console.log("Testing getFaceDescriptor...");
        const desc = await FaceService.getFaceDescriptor(buffer);
        console.log("Descriptor:", desc ? desc.length : "null");
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit(0);
    }
}
test();
