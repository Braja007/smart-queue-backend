const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");
const { getStudentDashboard, getTokenHistory } = require("../controllers/studentDashboardController");
const { cancelToken } = require("../controllers/queueController");

router.get('/dashboard', verifyToken, authorizeRoles('student'), getStudentDashboard);
router.get('/history', verifyToken, authorizeRoles('student'), getTokenHistory);
router.put('/cancel/:id', verifyToken, authorizeRoles('student'), cancelToken);

module.exports = router;