const MealConsumption = require('../models/MealConsumption');
const Hosteler = require('../models/Hostelers');
const Attendance = require('../models/Attendance');
const Request = require('../models/Requests');
const moment = require('moment');

// Week-wise Analytics
exports.getWeeklyAnalytics = async (req, res) => {
    try {
        const { startDate } = req.query; // Expects YYYY-MM-DD
        const start = moment(startDate).startOf('day').toDate();
        const end = moment(startDate).add(6, 'days').endOf('day').toDate();

        const mealAnalytics = await MealConsumption.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    totalMeals: [{ $count: "count" }],
                    mealTypeDistribution: [
                        { $group: { _id: "$mealType", count: { $sum: 1 } } }
                    ],
                    dayWiseConsumption: [
                        { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    popularFood: [
                        { $group: { _id: "$foodName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 5 }
                    ],
                    foodItemBreakdown: [
                        { $group: { _id: { name: "$foodName", category: "$mealType" }, count: { $sum: 1 } } },
                        { $project: { name: "$_id.name", category: "$_id.category", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ],
                    entityWiseConsumption: [
                        { 
                            $group: { 
                                _id: { 
                                    hostelId: { 
                                        $cond: {
                                            if: { $in: ["$hostelId", ["N/A", "Legacy", null]] },
                                            then: "Main",
                                            else: { $ifNull: ["$hostelId", "Main"] }
                                        }
                                    }, 
                                    college: { 
                                        $cond: {
                                            if: { $in: ["$college", ["N/A", "System", null]] },
                                            then: "HostelX",
                                            else: { $ifNull: ["$college", "HostelX"] }
                                        }
                                    } 
                                }, 
                                count: { $sum: 1 } 
                            } 
                        },
                        { $project: { hostelId: "$_id.hostelId", college: "$_id.college", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        // Accurate Presence Analytics based on Start Date
        const endOfStart = moment(startDate).add(6, 'days').endOf('day').toDate();
        
        // 1. Get total students per hostel
        const hostelTotals = await Hosteler.aggregate([
            { $group: { _id: { $ifNull: ["$hostelId", "Unassigned"] }, total: { $sum: 1 } } }
        ]);

        // 2. Get students on leave during this start date
        const leavesOnDate = await Request.aggregate([
            { 
                $match: { 
                    type: { $regex: /^LEAVE$/i },
                    status: { $in: ["ACCEPTED", "ARRIVED"] },
                    "accepted.time": { $lte: endOfStart },
                    $or: [
                        { "arrived.time": { $gt: start } },
                        { "arrived.time": { $exists: false } }
                    ]
                } 
            },
            { $group: { _id: "$hostelId", count: { $sum: 1 } } }
        ]);

        // 3. Merge into studentStatusAnalytics
        const studentStatusAnalytics = hostelTotals.map(h => {
            const leaveCount = leavesOnDate.find(l => l._id === h._id)?.count || 0;
            return {
                hostelId: h._id,
                total: h.total,
                onLeave: leaveCount,
                present: Math.max(0, h.total - leaveCount)
            };
        }).sort((a, b) => a.hostelId.localeCompare(b.hostelId));

        const finalData = {
            ...mealAnalytics[0],
            studentStatusAnalytics
        };

        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Month-wise Analytics
exports.getMonthlyAnalytics = async (req, res) => {
    try {
        const { year, month } = req.query; // e.g., 2024, 05
        const start = moment(`${year}-${month}-01`).startOf('month').toDate();
        const end = moment(`${year}-${month}-01`).endOf('month').toDate();

        const mealAnalytics = await MealConsumption.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    totalMeals: [
                        { $group: { _id: null, count: { $sum: 1 } } }
                    ],
                    weeklyBreakdown: [
                        {
                            $group: {
                                _id: { $week: "$date" },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { "_id": 1 } }
                    ],
                    peakDay: [
                        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 1 }
                    ],
                    lowestDay: [
                        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, count: { $sum: 1 } } },
                        { $sort: { count: 1 } },
                        { $limit: 1 }
                    ],
                    mostPopularMeal: [
                        { $group: { _id: "$mealType", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 1 }
                    ],
                    popularFood: [
                        { $group: { _id: "$foodName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 5 }
                    ],
                    dayWiseConsumption: [
                        { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    foodItemBreakdown: [
                        { $group: { _id: { name: "$foodName", category: "$mealType" }, count: { $sum: 1 } } },
                        { $project: { name: "$_id.name", category: "$_id.category", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ],
                    entityWiseConsumption: [
                        { 
                            $group: { 
                                _id: { 
                                    hostelId: { 
                                        $cond: {
                                            if: { $in: ["$hostelId", ["N/A", "Legacy", null]] },
                                            then: "Main",
                                            else: { $ifNull: ["$hostelId", "Main"] }
                                        }
                                    }, 
                                    college: { 
                                        $cond: {
                                            if: { $in: ["$college", ["N/A", "System", null]] },
                                            then: "HostelX",
                                            else: { $ifNull: ["$college", "HostelX"] }
                                        }
                                    } 
                                }, 
                                count: { $sum: 1 } 
                            } 
                        },
                        { $project: { hostelId: "$_id.hostelId", college: "$_id.college", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        // Accurate Presence Analytics based on Start Date (1st of month)
        // 1. Get total students per hostel
        const hostelTotals = await Hosteler.aggregate([
            { $group: { _id: { $ifNull: ["$hostelId", "Unassigned"] }, total: { $sum: 1 } } }
        ]);

        // 2. Get students on leave during the first of the month
        const leavesOnDate = await Request.aggregate([
            { 
                $match: { 
                    type: { $regex: /^LEAVE$/i },
                    status: { $in: ["ACCEPTED", "ARRIVED"] },
                    "accepted.time": { $lte: end },
                    $or: [
                        { "arrived.time": { $gt: start } },
                        { "arrived.time": { $exists: false } }
                    ]
                } 
            },
            { $group: { _id: "$hostelId", count: { $sum: 1 } } }
        ]);

        // 3. Merge into studentStatusAnalytics
        const studentStatusAnalytics = hostelTotals.map(h => {
            const leaveCount = leavesOnDate.find(l => l._id === h._id)?.count || 0;
            return {
                hostelId: h._id,
                total: h.total,
                onLeave: leaveCount,
                present: Math.max(0, h.total - leaveCount)
            };
        }).sort((a, b) => a.hostelId.localeCompare(b.hostelId));

        const finalData = {
            ...mealAnalytics[0],
            studentStatusAnalytics
        };

        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Day-wise Analytics
exports.getDailyAnalytics = async (req, res) => {
    try {
        const { date } = req.query; // Expects YYYY-MM-DD
        const start = moment(date).startOf('day').toDate();
        const end = moment(date).endOf('day').toDate();

        const mealAnalytics = await MealConsumption.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    totalMeals: [{ $count: "count" }],
                    mealTypeDistribution: [
                        { $group: { _id: "$mealType", count: { $sum: 1 } } }
                    ],
                    dayWiseConsumption: [
                        { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    popularFood: [
                        { $group: { _id: "$foodName", count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 5 }
                    ],
                    foodItemBreakdown: [
                        { $group: { _id: { name: "$foodName", category: "$mealType" }, count: { $sum: 1 } } },
                        { $project: { name: "$_id.name", category: "$_id.category", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ],
                    entityWiseConsumption: [
                        { 
                            $group: { 
                                _id: { 
                                    hostelId: { 
                                        $cond: {
                                            if: { $in: ["$hostelId", ["N/A", "Legacy", null]] },
                                            then: "Main",
                                            else: { $ifNull: ["$hostelId", "Main"] }
                                        }
                                    }, 
                                    college: { 
                                        $cond: {
                                            if: { $in: ["$college", ["N/A", "System", null]] },
                                            then: "HostelX",
                                            else: { $ifNull: ["$college", "HostelX"] }
                                        }
                                    } 
                                }, 
                                count: { $sum: 1 } 
                            } 
                        },
                        { $project: { hostelId: "$_id.hostelId", college: "$_id.college", count: 1, _id: 0 } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        // Accurate Presence Analytics based on Date
        const targetDate = moment(date).startOf('day').toDate();
        const endOfTargetDate = moment(date).endOf('day').toDate();
        
        // 1. Get total students per hostel
        const hostelTotals = await Hosteler.aggregate([
            { $group: { _id: { $ifNull: ["$hostelId", "Unassigned"] }, total: { $sum: 1 } } }
        ]);

        // 2. Get students on leave for this specific date (Matches Active Requests logic)
        const leavesOnDate = await Request.aggregate([
            { 
                $match: { 
                    type: { $regex: /^LEAVE$/i },
                    status: { $in: ["ACCEPTED", "ARRIVED"] }, // Must be a validated leave
                    "accepted.time": { $lte: endOfTargetDate },
                    $or: [
                        { "arrived.time": { $gt: targetDate } },
                        { "arrived.time": { $exists: false } }
                    ]
                } 
            },
            { $group: { _id: "$hostelId", count: { $sum: 1 } } }
        ]);

        // 3. Merge into studentStatusAnalytics
        const studentStatusAnalytics = hostelTotals.map(h => {
            const leaveCount = leavesOnDate.find(l => l._id === h._id)?.count || 0;
            return {
                hostelId: h._id,
                total: h.total,
                onLeave: leaveCount,
                present: Math.max(0, h.total - leaveCount)
            };
        }).sort((a, b) => a.hostelId.localeCompare(b.hostelId));

        const finalData = {
            ...mealAnalytics[0],
            studentStatusAnalytics
        };

        res.status(200).json({ success: true, data: finalData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
