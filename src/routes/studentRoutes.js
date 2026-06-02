const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require("../middlewares/authMiddleware");
const { getStudentDashboard, getTokenHistory } = require("../controllers/studentDashboardController");
const { cancelToken } = require("../controllers/queueController");
const { validateMongoId, paginationValidation } = require('../middlewares/validate');

router.get('/dashboard', verifyToken, authorizeRoles('student'), getStudentDashboard);
router.get('/history', verifyToken, authorizeRoles('student'), paginationValidation, getTokenHistory);
router.put('/cancel/:id', verifyToken, authorizeRoles('student'), validateMongoId, cancelToken);

module.exports = router;