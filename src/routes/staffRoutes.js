const express = require('express');
const router = express.Router();
const { getStaffDashboard, getActiveQueueList, getTodayProcessed, getMissedTokensList, } = require('../controllers/staffDashboardController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');

// GET full overview of all services
router.get('/dashboard', verifyToken, authorizeRoles('staff', 'admin'), getStaffDashboard);

// GET active waiting list for one service
router.get('/queue/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getActiveQueueList);

// GET completed tokens today
router.get('/processed/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getTodayProcessed);

// GET missed tokens today
router.get('/missed/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getMissedTokensList);

module.exports = router;