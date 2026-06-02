const express = require('express');
const router = express.Router();
const { getDailyAnalytics, getAvgWaitTime, getPeakHours, getDateRangeAnalytics, getMostCrowdedOffice, getOfficeComparison, getStudentInsights,} = require('../controllers/analyticsController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { analyticsDateValidation } = require('../middlewares/validate');

// All analytics routes — admin only
router.use(verifyToken, authorizeRoles('admin'));

// GET /analytics/daily?date=2024-01-15
router.get('/daily', analyticsDateValidation, getDailyAnalytics);

// GET /analytics/wait-time?date=2024-01-15
router.get('/wait-time', analyticsDateValidation, getAvgWaitTime);

// GET /analytics/peak-hours?date=2024-01-15&serviceId=<id>
router.get('/peak-hours', analyticsDateValidation, getPeakHours);

// GET /analytics/range?days=7
router.get('/range', getDateRangeAnalytics);

// GET /analytics/most-crowded?date=2024-01-15
router.get('/most-crowded', analyticsDateValidation, getMostCrowdedOffice);

// GET /analytics/office-comparison?days=7
router.get('/office-comparison', getOfficeComparison);

// GET /analytics/student-insights?date=2024-01-15
router.get('/student-insights', analyticsDateValidation, getStudentInsights);

module.exports = router;