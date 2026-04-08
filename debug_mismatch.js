const mongoose = require('mongoose');
const Request = require('./models/Requests');
const { Hostel } = require('./models/CollegeBranchHostelSchema');
const dotenv = require('dotenv');

dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to DB');

        // 1. Fetch Active Requests (Logic from requestsController / InchargeService)
        // In requestsController.acceptedRequestsByHostelId:
        // status: "ACCEPTED", isActive: true
        const activeRequests = await Request.find({
            status: "ACCEPTED",
            isActive: true
        });

        console.log(`Total Active Requests: ${activeRequests.length}`);

        // 2. Fetch Daily Leaves Logic (Active + Arrived for Today)
        const date = new Date(); // TODAY
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const dailyLeavesQuery = {
            status: { $in: ['ACCEPTED', 'ARRIVED', 'arrived', 'Arrived'] },
            $or: [
                {
                    type: 'LEAVE',
                    fromDate: { $lte: endOfDay },
                    toDate: { $gte: startOfDay }
                },
                {
                    type: 'PERMISSION',
                    date: { $gte: startOfDay, $lte: endOfDay }
                }
            ]
        };

        const dailyLeaves = await Request.find(dailyLeavesQuery);
        console.log(`Total Daily Leaves (Before filtering present): ${dailyLeaves.length}`);

        // Compare
        const activeIds = activeRequests.map(r => r.id);
        const dailyIds = dailyLeaves.map(r => r.id);

        const inActiveButNotDaily = activeRequests.filter(r => !dailyIds.includes(r.id));
        const inDailyButNotActive = dailyLeaves.filter(r => !activeIds.includes(r.id));

        console.log(`\nSUMMARY:`);
        console.log(`Active Requests (Total from DB): ${activeRequests.length}`);
        console.log(`Daily Leaves (Total from DB Query): ${dailyLeaves.length}`);
        console.log(`Active But Not Daily (Date Mismatch/Overstay): ${inActiveButNotDaily.length}`);
        console.log(`Daily But Not Active (Arrived): ${inDailyButNotActive.length}`);

        console.log("\n--- First 5 Active but NOT in Daily ---");
        inActiveButNotDaily.slice(0, 5).forEach(r => {
            console.log(`[${r.type}] Roll: ${r.rollNo}, From: ${r.fromDate?.toISOString().split('T')[0]}, To: ${r.toDate?.toISOString().split('T')[0]}, Active: ${r.isActive}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
};

run();
