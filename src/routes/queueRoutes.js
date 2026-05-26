const express = require('express');
const router = express.Router();
const { bookToken, getMyTokens, cancelToken, } = require('../controllers/queueController');
const { verifyToken, authorizeRoles } = require('../middlewares/authMiddleware');
const { bookTokenValidation } = require('../middlewares/validate');

router.post( '/token', verifyToken, authorizeRoles('student'), bookTokenValidation, bookToken );

router.get( '/my-tokens', verifyToken, authorizeRoles('student'), getMyTokens );

router.put( '/cancel/:id', verifyToken, authorizeRoles('student'), cancelToken );

module.exports = router;