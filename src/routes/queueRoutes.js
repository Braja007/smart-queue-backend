const express = require('express');
const router = express.Router();
const { bookToken, getMyTokens, cancelToken, } = require('../controllers/queueController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { bookTokenValidation } = require('../middlewares/validate');
const { initQueue, getQueueState, getQueuesOverview, } = require('../controllers/queueStateController');
const { callNext, completeToken, skipToken } = require("../controllers/staffQueueController");

router.post('/token', verifyToken, authorizeRoles('student'), bookTokenValidation, bookToken);
router.get('/my-tokens', verifyToken, authorizeRoles('student'), getMyTokens);
router.put('/cancel/:id', verifyToken, authorizeRoles('student'), cancelToken);
router.post('/init/:serviceId', verifyToken, authorizeRoles('admin'), initQueue);
router.get('/overview', verifyToken, authorizeRoles('admin'), getQueuesOverview);
router.get('/state/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getQueueState);

router.put('/next/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), callNext);
router.put('/complete/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), completeToken);
router.put('/skip/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), skipToken);

module.exports = router;