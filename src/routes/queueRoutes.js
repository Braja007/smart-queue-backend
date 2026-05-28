const express = require('express');
const router = express.Router();
const { bookToken, getMyTokens, cancelToken, getTokenStatus, getMyQueuePosition } = require('../controllers/queueController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { bookTokenValidation, rejoinValidation } = require('../middlewares/validate');
const { initQueue, getQueueState, getQueuesOverview, } = require('../controllers/queueStateController');
const { callNext, completeToken, skipToken, pauseQueue, resumeQueue } = require("../controllers/staffQueueController");
const { rejoinQueue, getMissedHistory, getServiceMissedTokens } = require("../controllers/missedTokenController");

//student's route-
router.post('/token', verifyToken, authorizeRoles('student'), bookTokenValidation, bookToken);
router.get('/my-tokens', verifyToken, authorizeRoles('student'), getMyTokens);
router.put('/cancel/:id', verifyToken, authorizeRoles('student'), cancelToken);
router.get('/position/:serviceId', verifyToken, authorizeRoles('student'), getMyQueuePosition);
router.post('/rejoin', verifyToken, authorizeRoles('student'), rejoinValidation,rejoinQueue);
router.get('/missed-history', verifyToken, authorizeRoles('student'), getMissedHistory);

//staff's & admin's route-
router.post('/init/:serviceId', verifyToken, authorizeRoles('admin'), initQueue);
router.get('/overview', verifyToken, authorizeRoles('admin'), getQueuesOverview);
router.get('/state/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getQueueState);
router.put('/next/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), callNext);
router.put('/complete/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), completeToken);
router.put('/skip/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), skipToken);
router.get('/status/:tokenId', verifyToken, getTokenStatus);
router.get('/missed/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), getServiceMissedTokens);
router.put('/pause/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), pauseQueue);
router.put('/resume/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), resumeQueue);

module.exports = router;