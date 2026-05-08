const express = require('express');
const router = express.Router();
const mealController = require('../controllers/mealController');
const analyticsController = require('../controllers/mealAnalyticsController');
const { authenticateUser, isIncharge, isStudent } = require('../middleware/auth');

// --- TEMPLATE ROUTES (Incharge) ---
router.get('/template', authenticateUser, mealController.getTemplate);
router.post('/template', authenticateUser, isIncharge, mealController.updateTemplate);

// --- FOOD LIBRARY (Incharge) ---
router.get('/food-items', authenticateUser, mealController.getFoodItems);
router.post('/food-items', authenticateUser, isIncharge, mealController.addFoodItem);
router.delete('/food-items/:id', authenticateUser, isIncharge, mealController.deleteFoodItem);

// --- QR GENERATION (Incharge) ---
router.get('/generate-qr', authenticateUser, isIncharge, mealController.generateMealQR);

// --- SCAN LOGIC (Student) ---
router.post('/scan', authenticateUser, isStudent, mealController.scanMeal);
router.get('/today-status', authenticateUser, isStudent, mealController.getTodayStatus);

// --- ANALYTICS ROUTES (Incharge) ---
router.get('/analytics/day', authenticateUser, isIncharge, analyticsController.getDailyAnalytics);
router.get('/analytics/week', authenticateUser, isIncharge, analyticsController.getWeeklyAnalytics);
router.get('/analytics/month', authenticateUser, isIncharge, analyticsController.getMonthlyAnalytics);

// --- MEAL TIMINGS ---
router.get('/timings', authenticateUser, mealController.getMealTimings);
router.post('/timings', authenticateUser, isIncharge, mealController.updateMealTimings);
router.get('/active-meal', authenticateUser, mealController.getActiveMeal);

module.exports = router;
