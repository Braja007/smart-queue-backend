const Token = require('../models/Token');
const Service = require('../models/Service');
const { generateTokenNumber, getTodayCount, getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');
const { validationResult } = require('express-validator');
const Queue = require("../models/Queue");
const { getOrInitQueue } = require("../utils/queueUtils");

const bookToken = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { serviceId } = req.body;
    const studentId = req.user._id;
    const today = getTodayDate();

    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }
        if (!service.isActive) {
            return sendError(res, 400, 'This service is currently inactive');
        }

        const todayCount = await getTodayCount(service.prefix);
        if (todayCount >= service.dailyLimit) {
            return sendError(
                res,
                400,
                `Daily limit of ${service.dailyLimit} tokens reached for ${service.name}. Please try again tomorrow.`
            );
        }

        const existingToken = await Token.findOne({
            student: studentId,
            service: serviceId,
            bookedDate: today,
            status: { $in: ['waiting', 'called'] },
        });

        if (existingToken) {
            return sendError(
                res,
                409,
                `You already have an active token (${existingToken.tokenNumber}) for this service today`
            );
        }

        const waitingAhead = await Token.countDocuments({
            service: serviceId,
            bookedDate: today,
            status: 'waiting',
        });

        const tokenNumber = await generateTokenNumber(service.prefix);

        const token = await Token.create({
            tokenNumber,
            service: serviceId,
            student: studentId,
            status: 'waiting',
            queuePosition: waitingAhead + 1,
            bookedDate: today,
        });
        const queue = await getOrInitQueue(serviceId);
        queue.waitingList.push(token._id);
        await queue.save();

        const estimatedWaitTime = waitingAhead * service.avgProcessTime;

        return sendSuccess(res, 201, 'Token booked successfully', {
            token: {
                id: token._id,
                tokenNumber: token.tokenNumber,
                service: service.name,
                status: token.status,
                queuePosition: token.queuePosition,
                estimatedWaitTime: `${estimatedWaitTime} minutes`,
                bookedDate: token.bookedDate,
                bookedAt: token.createdAt,
            },
        });
    } catch (error) {
        console.error('Book token error:', error.message);
        return sendError(res, 500, 'Server error while booking token');
    }
};

const getMyTokens = async (req, res) => {
    try {
        const studentId = req.user._id;
        const today = getTodayDate();

        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const dateFilter = req.query.date || today;

        const statusFilter = req.query.status
            ? { status: req.query.status }
            : {};

        const tokens = await Token.find({
            student: studentId,
            bookedDate: dateFilter,
            ...statusFilter,
        })
            .populate('service', 'name prefix avgProcessTime')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Token.countDocuments({
            student: studentId,
            bookedDate: dateFilter,
            ...statusFilter,
        });

        return sendSuccess(res, 200, 'Tokens fetched successfully', {
            tokens,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Get my tokens error:', error.message);
        return sendError(res, 500, 'Server error while fetching tokens');
    }
};

const cancelToken = async (req, res) => {
    try {
        const token = await Token.findById(req.params.id).populate('service', 'name');

        if (!token) {
            return sendError(res, 404, 'Token not found');
        }

        if (token.student.toString() !== req.user._id.toString()) {
            return sendError(res, 403, 'You can only cancel your own tokens');
        }

        if (token.status !== 'waiting') {
            return sendError(
                res,
                400,
                `Cannot cancel a token with status '${token.status}'. Only waiting tokens can be cancelled`
            );
        }

        token.status = 'cancelled';
        await token.save();

        return sendSuccess(res, 200, 'Token cancelled successfully', {
            token: {
                id: token._id,
                tokenNumber: token.tokenNumber,
                service: token.service.name,
                status: token.status,
            },
        });
    } catch (error) {
        console.error('Cancel token error:', error.message);
        return sendError(res, 500, 'Server error while cancelling token');
    }
};

const getTokenStatus = async (req, res) => {
    try {
        const token = await Token.findById(req.params.tokenId)
            .populate('service', 'name prefix avgProcessTime')
            .populate('student', 'name email');
        if (!token) {
            return sendError(res, 404, 'Token not found');
        }
        if (req.user.role === 'student' && token.student._id.toString() !== req.user._id.toString()) {
            return sendError(res, 403, 'You can only view status of your own tokens');
        }
        const today = getTodayDate();

        // If the token is already completed, missed, or cancelled return status directly with no queue info
        if (!['waiting', 'called'].includes(token.status)) {
            return sendSuccess(res, 200, 'Token status fetched', {
                token: {
                    id: token._id,
                    tokenNumber: token.tokenNumber,
                    service: token.service.name,
                    status: token.status,
                    bookedDate: token.bookedDate,
                    calledAt: token.calledAt || null,
                    completedAt: token.completedAt || null,
                    missedAt: token.missedAt || null,
                },
            });
        }
        const queue = await Queue.findOne({ service: token.service._id });

        let peopleAhead = 0;
        let queuePosition = 0;

        if (queue) {
            // Find position in waiting list
            const waitingIds = queue.waitingList.map((id) => id.toString());
            const positionIndex = waitingIds.indexOf(token._id.toString());

            if (positionIndex !== -1) {
                peopleAhead = positionIndex;
                queuePosition = positionIndex + 1;
            }

            // If token is currently being called it's at position 0
            if (queue.currentToken && queue.currentToken.toString() === token._id.toString()) {
                peopleAhead = 0;
                queuePosition = 0;
            }
        }
        const estimatedWaitTime = peopleAhead * token.service.avgProcessTime;

        return sendSuccess(res, 200, 'Token status fetched successfully', {
            token: {
                id: token._id,
                tokenNumber: token.tokenNumber,
                service: token.service.name,
                status: token.status,
                bookedDate: token.bookedDate,
                bookedAt: token.createdAt,
            },
            queue: {
                queuePosition,
                peopleAhead,
                estimatedWaitTime: `${estimatedWaitTime} minutes`,
                isCurrentlyBeingServed: queuePosition === 0 && token.status === 'called',
            },
        });
    } catch (error) {
        console.error('Get token status error:', error.message);
        return sendError(res, 500, 'Server error while fetching token status');
    }
};

const getMyQueuePosition = async (req, res) => {
    try {
        const today = getTodayDate();

        const token = await Token.findOne({
            student: req.user._id,
            service: req.params.serviceId,
            bookedDate: today,
            status: { $in: ['waiting', 'called'] },
        }).populate('service', 'name prefix avgProcessTime');

        if (!token) {
            return sendError(
                res,
                404,
                'No active token found for this service today'
            );
        }

        const queue = await Queue.findOne({ service: req.params.serviceId });

        let peopleAhead = 0;
        let queuePosition = 0;
        let isCurrentlyBeingServed = false;

        if (queue) {
            // Check if currently being served
            if ( queue.currentToken && queue.currentToken.toString() === token._id.toString()) {
                peopleAhead = 0;
                queuePosition = 0;
                isCurrentlyBeingServed = true;
            } else {
                // Find position in waiting list
                const waitingIds = queue.waitingList.map((id) => id.toString());
                const positionIndex = waitingIds.indexOf(token._id.toString());

                if (positionIndex !== -1) {
                    peopleAhead = positionIndex;
                    queuePosition = positionIndex + 1;
                }
            }
        }

        const estimatedWaitTime = peopleAhead * token.service.avgProcessTime;

        // Dynamic message based on position
        let message = '';
        if (isCurrentlyBeingServed) {
            message = 'Your token is currently being served. Please proceed to the counter';
        } else if (peopleAhead === 0 && !isCurrentlyBeingServed) {
            message = 'You are next in line. Please be ready';
        } else if (peopleAhead <= 3) {
            message = `Only ${peopleAhead} people ahead. Please stay nearby`;
        } else {
            message = `${peopleAhead} people ahead. Estimated wait: ${estimatedWaitTime} minutes`;
        }

        return sendSuccess(res, 200, 'Queue position fetched successfully', {
            token: {
                id: token._id,
                tokenNumber: token.tokenNumber,
                service: token.service.name,
                status: token.status,
            },
            queue: {
                queuePosition,
                peopleAhead,
                estimatedWaitTime: `${estimatedWaitTime} minutes`,
                isCurrentlyBeingServed,
            },
            message,
        });
    } catch (error) {
        console.error('Get position error:', error.message);
        return sendError(res, 500, 'Server error while fetching queue position');
    }
};
module.exports = { bookToken, getMyTokens, cancelToken, getTokenStatus, getMyQueuePosition };