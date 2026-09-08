const { MongoClient } = require('mongodb');
MongoClient.connect('mongodb+srv://moturisireesha:Omsaisneha21@cluster0.i12tj.mongodb.net/hostel_attendence?appName=Cluster0')
.then(async client => {
  const db = client.db('hostel_attendence');
  const res = await db.collection('attendances').find({ date: { $regex: '^9/' } }).limit(5).toArray();
  console.log('Found 9/:', res.length);
  const res2 = await db.collection('attendances').find({ date: { $regex: '^2026-09' } }).limit(5).toArray();
  console.log('Found 2026-09:', res2.length);
  const allRes = await db.collection('attendances').find().sort({_id: -1}).limit(1).toArray();
  console.log('Latest record:', allRes);
  process.exit(0);
});
