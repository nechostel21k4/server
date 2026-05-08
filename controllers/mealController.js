const WeeklyMenuTemplate = require('../models/WeeklyMenuTemplate');
const MealConsumption = require('../models/MealConsumption');
const FoodItem = require('../models/FoodItem');
const jwt = require('jsonwebtoken');
const moment = require('moment');

// INCHARGE: Create or Update Weekly Template
exports.updateTemplate = async (req, res) => {
    try {
        const { menuItems } = req.body;
        const bulkOps = menuItems.map(item => ({
            updateOne: {
                filter: { dayOfWeek: item.dayOfWeek, mealType: item.mealType },
                update: { foodName: item.foodName, updatedBy: req.user.id },
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
        const template = await WeeklyMenuTemplate.find();
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// INCHARGE: Manage Food Items Library
exports.getFoodItems = async (req, res) => {
    try {
        let items = await FoodItem.find().sort({ name: 1 });
        
        res.status(200).json({ success: true, data: items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addFoodItem = async (req, res) => {
    try {
        const { name, category } = req.body;
        const newItem = new FoodItem({ name, category });
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
        const { mealType } = req.query;
        if (!['breakfast', 'lunch', 'snacks', 'dinner'].includes(mealType)) {
            return res.status(400).json({ success: false, message: "Invalid meal type" });
        }
        const today = moment().format('YYYY-MM-DD');
        const menu = await WeeklyMenuTemplate.findOne({ dayOfWeek: moment().format('dddd'), mealType });
        if (!menu) return res.status(404).json({ success: false, message: "Menu not set for today" });
        
        const midnight = moment().endOf('day').unix();
        const payload = { date: today, mealType, dayOfWeek: moment().format('dddd'), foodName: menu.foodName, exp: midnight };
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
        const { date, mealType, dayOfWeek, foodName } = decoded;

        // 1. Time Check
        if (date !== moment().format('YYYY-MM-DD')) {
            return res.status(403).json({ success: false, message: "This QR is not for today" });
        }

        // 2. Strict Menu Verification (Fix for cross-app/wrong-db scanning)
        // Ensure the foodName in the QR matches what is currently set in THIS database's template
        const currentTemplate = await WeeklyMenuTemplate.findOne({ dayOfWeek: moment().format('dddd'), mealType });
        
        if (!currentTemplate || currentTemplate.foodName !== foodName) {
            return res.status(403).json({ 
                success: false, 
                message: "Invalid Menu Source: This QR does not match the current menu for this hostel." 
            });
        }

        const consumption = new MealConsumption({
            studentId: req.user.id,
            date: new Date(date),
            dayOfWeek, mealType, foodName, scannedAt: new Date()
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
        const consumed = await MealConsumption.find({
            studentId: req.user.id,
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
        res.status(200).json({ success: true, data: { totalMeals, popularFood, dayWiseConsumption, mealTypeDistribution } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
