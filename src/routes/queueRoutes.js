const express = require('express');
const router = express.Router();
const { bookToken, getMyTokens, cancelToken, getTokenStatus, getMyQueuePosition } = require('../controllers/queueController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const {
    bookTokenValidation,
    rejoinValidation,
    validateMongoId,
    validateServiceId,
    validateTokenId,
    paginationValidation
} = require('../middlewares/validate');
const { initQueue, getQueueState, getQueuesOverview, } = require('../controllers/queueStateController');
const { callNext, completeToken, skipToken, pauseQueue, resumeQueue } = require("../controllers/staffQueueController");
const { rejoinQueue, getMissedHistory, getServiceMissedTokens } = require("../controllers/missedTokenController");

//student's route-
router.post('/token', verifyToken, authorizeRoles('student'), bookTokenValidation, bookToken);
router.get('/my-tokens', verifyToken, authorizeRoles('student'), paginationValidation, getMyTokens);
router.put('/cancel/:id', verifyToken, authorizeRoles('student'), validateMongoId, cancelToken);
router.get('/position/:serviceId', verifyToken, authorizeRoles('student'), validateServiceId, getMyQueuePosition);
router.post('/rejoin', verifyToken, authorizeRoles('student'), rejoinValidation, rejoinQueue);
router.get('/missed-history', verifyToken, authorizeRoles('student'), paginationValidation, getMissedHistory);

//staff's & admin's route-
router.post('/init/:serviceId', verifyToken, authorizeRoles('admin'), validateServiceId, initQueue);
router.get('/overview', verifyToken, authorizeRoles('admin'), getQueuesOverview);
router.get('/state/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, getQueueState);
router.put('/next/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, callNext);
router.put('/complete/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, completeToken);
router.put('/skip/:serviceId', verifyToken, validateServiceId, authorizeRoles('staff', 'admin'), skipToken);
router.get('/status/:tokenId', verifyToken, validateTokenId, getTokenStatus);
router.get('/missed/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, getServiceMissedTokens);
router.put('/pause/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, pauseQueue);
router.put('/resume/:serviceId', verifyToken, authorizeRoles('staff', 'admin'), validateServiceId, resumeQueue);

module.exports = router;