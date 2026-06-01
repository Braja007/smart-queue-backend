const express = require('express');
const router = express.Router();
const { getDailyAnalytics, getAvgWaitTime, getPeakHours, getDateRangeAnalytics, } = require('../controllers/analyticsController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// All analytics routes — admin only
router.use(verifyToken, authorizeRoles('admin'));

// GET /analytics/daily?date=2024-01-15
router.get('/daily', getDailyAnalytics);

// GET /analytics/wait-time?date=2024-01-15
router.get('/wait-time', getAvgWaitTime);

// GET /analytics/peak-hours?date=2024-01-15&serviceId=<id>
router.get('/peak-hours', getPeakHours);

// GET /analytics/range?days=7
router.get('/range', getDateRangeAnalytics);

module.exports = router;