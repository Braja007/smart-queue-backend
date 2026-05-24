const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { sendSuccess } = require('../utils/response');

router.get('/user', verifyToken, (req, res) => {
    sendSuccess(res, 200, 'All authenticated users can access this', {
        role: req.user.role,
    });
});

router.get('/staff', verifyToken, authorizeRoles('staff', 'admin'), (req, res) => {
    sendSuccess(res, 200, 'Staff and admin only area', {
        role: req.user.role,
    });
});

router.get('/admin', verifyToken, authorizeRoles('admin'), (req, res) => {
    sendSuccess(res, 200, 'Admin only area', {
        role: req.user.role,
    });
});

module.exports = router;