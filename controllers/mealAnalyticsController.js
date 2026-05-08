const MealConsumption = require('../models/MealConsumption');
const moment = require('moment');

// Week-wise Analytics
exports.getWeeklyAnalytics = async (req, res) => {
    try {
        const { startDate } = req.query; // Expects YYYY-MM-DD
        const start = moment(startDate).startOf('day').toDate();
        const end = moment(startDate).add(6, 'days').endOf('day').toDate();

        const analytics = await MealConsumption.aggregate([
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
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, data: analytics[0] });
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

        const analytics = await MealConsumption.aggregate([
            {
                $match: {
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $facet: {
                    overall: [
                        { $group: { _id: null, total: { $sum: 1 } } }
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
                    ]
                }
            }
        ]);

        res.status(200).json({ success: true, data: analytics[0] });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
