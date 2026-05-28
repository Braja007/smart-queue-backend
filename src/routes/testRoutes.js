const express = require('express');
const router = express.Router();
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { sendSuccess } = require('../utils/response');
const { generateTokenNumber, getTodayCount } = require('../utils/tokenUtils');
const Service = require('../models/Service');

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

router.get('/token-gen/:serviceId', verifyToken, async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        const tokenNumber = await generateTokenNumber(service.prefix);
        const todayCount = await getTodayCount(service.prefix);

        res.json({
            success: true,
            data: {
                tokenNumber,
                todayCount,
                service: service.name,
                prefix: service.prefix,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
const { resetQueueIfNewDay } = require('../utils/queueUtils');
const Queue = require('../models/Queue');

router.get('/trigger-reset', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const queues = await Queue.find({});
    for (const queue of queues) {
      // Force lastResetDate to yesterday to trigger reset
      queue.lastResetDate = '2000-01-01';
      await queue.save();
      await resetQueueIfNewDay(queue);
    }
    res.json({ success: true, message: 'Reset triggered for all queues' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;