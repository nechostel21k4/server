const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://moturisireesha:Omsaisneha21@cluster0.i12tj.mongodb.net/hostel_attendence?appName=Cluster0').then(async () => {
    const db = mongoose.connection.db;
    const attendances = await db.collection('attendances').find({ date: { $in: ['2026-09-07', '2026-09-08'] } }).toArray();
    console.log('Count:', attendances.length);
    if (attendances.length > 0) console.log(attendances.map(a => ({date: a.date, id: a.studentId, time: a.time})));
    process.exit(0);
});
