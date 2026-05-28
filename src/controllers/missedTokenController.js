const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Service = require('../models/Service');
const { getOrInitQueue } = require('../utils/queueUtils');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');
const { validationResult } = require('express-validator');

const rejoinQueue = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { tokenId } = req.body;
    const today = getTodayDate();

    try {
        // Find the missed token
        const token = await Token.findById(tokenId)
            .populate('service', 'name prefix avgProcessTime isActive');

        if (!token) {
            return sendError(res, 404, 'Token not found');
        }

        // Only the owner can rejoin
        if (token.student.toString() !== req.user._id.toString()) {
            return sendError(res, 403, 'You can only rejoin with your own token');
        }

        //Only missed tokens can rejoin
        if (token.status !== 'missed') {
            return sendError(
                res,
                400,
                `Only missed tokens can rejoin the queue. Current status: ${token.status}`
            );
        }

        // Must be today's token
        if (token.bookedDate !== today) {
            return sendError(res, 400, 'You can only rejoin with today\'s token');
        }

        // Check service is still active
        if (!token.service.isActive) {
            return sendError(res, 400, 'This service is currently inactive');
        }

        // Get current queue state
        const queue = await getOrInitQueue(token.service._id);

        // Calculate new position — goes to end of queue
        const newPosition = queue.waitingList.length + 1;

        // Update token — mark as waiting again, flag as rejoined
        token.status = 'waiting';
        token.isRejoined = true;
        token.missedAt = undefined;
        token.queuePosition = newPosition;
        await token.save();

        // Push to end of waiting list (FIFO — rejoined goes last)
        queue.waitingList.push(token._id);
        await queue.save();

        const estimatedWaitTime =
            queue.waitingList.length * token.service.avgProcessTime;

        return sendSuccess(res, 200, 'Successfully rejoined the queue', {
            token: {
                id: token._id,
                tokenNumber: token.tokenNumber,
                service: token.service.name,
                status: token.status,
                isRejoined: token.isRejoined,
                newPosition,
                estimatedWaitTime: `${estimatedWaitTime} minutes`,
            },
            message: `You have been moved to position ${newPosition} at the end of the queue`,
        });
    } catch (error) {
        console.error('Rejoin queue error:', error.message);
        return sendError(res, 500, 'Server error while rejoining queue');
    }
};

const getMissedHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const missedTokens = await Token.find({
            student: req.user._id,
            status: 'missed',
        })
            .populate('service', 'name prefix')
            .sort({ missedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Token.countDocuments({
            student: req.user._id,
            status: 'missed',
        });

        return sendSuccess(res, 200, 'Missed token history fetched', {
            missedTokens: missedTokens.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                service: t.service.name,
                bookedDate: t.bookedDate,
                missedAt: t.missedAt,
                isRejoined: t.isRejoined,
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Missed history error:', error.message);
        return sendError(res, 500, 'Server error while fetching missed history');
    }
};

const getServiceMissedTokens = async (req, res) => {
    try {
        const today = getTodayDate();

        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const missedTokens = await Token.find({
            service: req.params.serviceId,
            bookedDate: today,
            status: 'missed',
        })
            .populate('student', 'name email')
            .sort({ missedAt: -1 });

        return sendSuccess(res, 200, 'Missed tokens fetched', {
            service: service.name,
            date: today,
            count: missedTokens.length,
            missedTokens: missedTokens.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                student: t.student,
                missedAt: t.missedAt,
                isRejoined: t.isRejoined,
            })),
        });
    } catch (error) {
        console.error('Service missed tokens error:', error.message);
        return sendError(res, 500, 'Server error while fetching missed tokens');
    }
};

module.exports = { rejoinQueue, getMissedHistory, getServiceMissedTokens, };