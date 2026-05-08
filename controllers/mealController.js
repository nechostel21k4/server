const WeeklyMenuTemplate = require('../models/WeeklyMenuTemplate');
const MealConsumption = require('../models/MealConsumption');
const FoodItem = require('../models/FoodItem');
const Hosteler = require('../models/Hostelers');
const jwt = require('jsonwebtoken');
const moment = require('moment');

// INCHARGE: Create or Update Weekly Template
exports.updateTemplate = async (req, res) => {
    try {
        const { menuItems, hostelId } = req.body;
        const targetHostel = hostelId || 'all';
        const bulkOps = menuItems.map(item => ({
            updateOne: {
                filter: { dayOfWeek: item.dayOfWeek, mealType: item.mealType, hostelId: targetHostel },
                update: { foodName: item.foodName, updatedBy: req.user.id, hostelId: targetHostel },
                upsert: true
            }
        }));
        await WeeklyMenuTemplate.bulkWrite(bulkOps);
        res.status(200).json({ success: true, message: "Template updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET: Fetch the current weekly template
exports.getTemplate = async (req, res) => {
    try {
        const { hostelId } = req.query;
        const filter = hostelId ? { hostelId: { $in: [hostelId, 'all'] } } : {};
        const template = await WeeklyMenuTemplate.find(filter);
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// INCHARGE: Manage Food Items Library
exports.getFoodItems = async (req, res) => {
    try {
        const { hostelId } = req.query;
        const filter = hostelId ? { hostelId: { $in: [hostelId, 'all'] } } : {};
        let items = await FoodItem.find(filter).sort({ name: 1 });
        
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addFoodItem = async (req, res) => {
    try {
        const { name, category, hostelId } = req.body;
        const targetHostel = hostelId || 'all';
        const newItem = new FoodItem({ name, category, hostelId: targetHostel });
        await newItem.save();
        res.status(201).json({ success: true, data: newItem });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "Item already exists in this category" });
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteFoodItem = async (req, res) => {
    try {
        await FoodItem.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Item removed from library" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// INCHARGE: Generate Today's QR
exports.generateMealQR = async (req, res) => {
    try {
        const { mealType, hostelId } = req.query;
        const targetHostel = hostelId || 'all';
        if (!['breakfast', 'lunch', 'snacks', 'dinner'].includes(mealType)) {
            return res.status(400).json({ success: false, message: "Invalid meal type" });
        }
        const today = moment().format('YYYY-MM-DD');
        const menu = await WeeklyMenuTemplate.findOne({ dayOfWeek: moment().format('dddd'), mealType, hostelId: targetHostel });
        if (!menu) return res.status(404).json({ success: false, message: "Menu not set for this hostel today" });
        
        const midnight = moment().endOf('day').unix();
        const payload = { date: today, mealType, dayOfWeek: moment().format('dddd'), foodName: menu.foodName, hostelId: targetHostel, exp: midnight };
        const qrToken = jwt.sign(payload, process.env.JWT_SECRET);
        res.status(200).json({ success: true, qrToken, payload });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// STUDENT: Scan QR
exports.scanMeal = async (req, res) => {
    try {
        const { qrToken } = req.body;
        let decoded = jwt.verify(qrToken, process.env.JWT_SECRET);
        const { date, mealType, dayOfWeek, foodName, hostelId: qrHostelId } = decoded;

        // 1. Time Check
        if (date !== moment().format('YYYY-MM-DD')) {
            return res.status(403).json({ success: false, message: "This QR is not for today" });
        }

        // 2. Strict Menu Verification
        const currentTemplate = await WeeklyMenuTemplate.findOne({ dayOfWeek: moment().format('dddd'), mealType, hostelId: qrHostelId || 'all' });
        if (!currentTemplate || currentTemplate.foodName !== foodName) {
            return res.status(403).json({ success: false, message: "Invalid Menu Source: This QR does not match the current menu for this hostel." });
        }

        // 3. Fetch Student Entity Info (Link credentials with Profile)
        const student = await Hosteler.findOne({ rollNo: req.user.rollNo }).select('_id hostelId college').lean();

        if (!student) {
            console.error(`[Scan Error] No Hosteler profile found for RollNo: ${req.user.rollNo}`);
        }

        const consumption = new MealConsumption({
            studentId: student?._id || req.user.id, // Save correct profile ref
            date: new Date(date),
            dayOfWeek, 
            mealType, 
            foodName,
            hostelId: student?.hostelId || 'Main',
            college: student?.college || 'HostelX',
            scannedAt: new Date()
        });
        await consumption.save();
        res.status(201).json({ success: true, message: `Enjoy your ${foodName}!` });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "Meal already consumed" });
        res.status(500).json({ success: false, message: error.message });
    }
};

// STUDENT: Get Status
exports.getTodayStatus = async (req, res) => {
    try {
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().endOf('day').toDate();

        // Must match the ID type saved in scanMeal (Hosteler ID)
        const student = await Hosteler.findOne({ rollNo: req.user.rollNo }).select('_id').lean();
        const targetId = student?._id || req.user.id;

        const consumed = await MealConsumption.find({
            studentId: targetId,
            date: { $gte: today, $lte: tomorrow }
        });
        res.status(200).json({ success: true, consumed });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Analytics (Internal usage or future tabs)
exports.getAnalytics = async (req, res) => {
    try {
        const totalMeals = await MealConsumption.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]);
        const popularFood = await MealConsumption.aggregate([{ $group: { _id: "$foodName", count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 5 }]);
        const dayWiseConsumption = await MealConsumption.aggregate([{ $group: { _id: "$dayOfWeek", count: { $sum: 1 } } }]);
        const mealTypeDistribution = await MealConsumption.aggregate([{ $group: { _id: "$mealType", count: { $sum: 1 } } }]);
        
        // Handle Legacy Data: Use 'Legacy' or 'Unassigned' if hostelId is missing
        const entityWiseConsumption = await MealConsumption.aggregate([
            { 
                $group: { 
                    _id: { 
                        hostelId: { $ifNull: ["$hostelId", "Legacy"] }, 
                        college: { $ifNull: ["$college", "System"] } 
                    }, 
                    count: { $sum: 1 } 
                } 
            },
            { $project: { hostelId: "$_id.hostelId", college: "$_id.college", count: 1, _id: 0 } },
            { $sort: { count: -1 } }
        ]);

        // Student Status Analytics
        const studentStatusAnalytics = await Hosteler.aggregate([
            {
                $group: {
                    _id: { $ifNull: ["$hostelId", "Unassigned"] },
                    total: { $sum: 1 },
                    onLeave: { $sum: { $cond: [{ $eq: ["$currentStatus", "LEAVE"] }, 1, 0] } },
                    present: { $sum: { $cond: [{ $ne: ["$currentStatus", "LEAVE"] }, 1, 0] } }
                }
            },
            { $project: { hostelId: "$_id", total: 1, onLeave: 1, present: 1, _id: 0 } },
            { $sort: { hostelId: 1 } }
        ]);

        res.status(200).json({ 
            success: true, 
            data: { 
                totalMeals, 
                popularFood, 
                dayWiseConsumption, 
                mealTypeDistribution,
                entityWiseConsumption,
                studentStatusAnalytics
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
