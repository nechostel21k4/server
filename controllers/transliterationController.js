const Hosteler = require('../models/Hostelers');
const { transliterateName } = require('../utils/transliterationUtils');

// Bulk update all students who don't have a Telugu name
exports.bulkUpdateStudentNames = async (req, res) => {
    try {
        // Find students where nameTelugu is missing or empty
        const studentsToUpdate = await Hosteler.find({
            $or: [{ nameTelugu: { $exists: false } }, { nameTelugu: '' }, { nameTelugu: null }]
        });

        console.log(`Found ${studentsToUpdate.length} students to update.`);

        let updatedCount = 0;
        let failedCount = 0;

        // Process in chunks to avoid overwhelming the API
        const CHUNK_SIZE = 10;
        for (let i = 0; i < studentsToUpdate.length; i += CHUNK_SIZE) {
            const chunk = studentsToUpdate.slice(i, i + CHUNK_SIZE);
            const updatePromises = chunk.map(async (student) => {
                if (!student.name) return;

                const teluguName = await transliterateName(student.name);
                if (teluguName && teluguName !== student.name) {
                    student.nameTelugu = teluguName;
                    await student.save();
                    updatedCount++;
                } else {
                    console.log(`Skipping ${student.name} -> ${teluguName}`)
                    failedCount++;
                }
            });

            await Promise.all(updatePromises);
            console.log(`Processed ${Math.min(i + CHUNK_SIZE, studentsToUpdate.length)}/${studentsToUpdate.length}`);

            // Small delay to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        res.status(200).json({
            success: true,
            message: 'Bulk update completed.',
            totalFound: studentsToUpdate.length,
            updated: updatedCount,
            failedOrSkipped: failedCount
        });

    } catch (error) {
        console.error('Error in bulkUpdateStudentNames:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update a single student's Telugu name (can be used for correction or on-create)
exports.updateStudentName = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await Hosteler.findById(id);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const teluguName = await transliterateName(student.name);
        student.nameTelugu = teluguName;
        await student.save();

        res.status(200).json({
            success: true,
            message: 'Student name updated successfully',
            data: {
                name: student.name,
                nameTelugu: student.nameTelugu
            }
        });

    } catch (error) {
        console.error('Error in updateStudentName:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}
