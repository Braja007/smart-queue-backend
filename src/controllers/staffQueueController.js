const Queue = require("../models/Queue");
const Token = require("../models/Token");
const Service = require("../models/Service");
const { getOrInitQueue } = require('../utils/queueUtils');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');

const callNext = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const queue = await getOrInitQueue(req.params.serviceId);

        if (queue.isPaused) {
            return sendError(res, 400, 'Queue is paused. Resume it before calling next token');
        }

        if (queue.currentToken) {
            return sendError(
                res,
                400,
                `Please complete or skip current token (${queue.currentToken.tokenNumber}) before calling next`
            );
        }

        if (queue.waitingList.length === 0) {
            return sendError(res, 400, 'No tokens waiting in queue');
        }

        const nextTokenId = queue.waitingList[0]._id;

        const calledToken = await Token.findByIdAndUpdate(
            nextTokenId,
            {
                $set: {
                    status: 'called',
                    calledAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        ).populate('student', 'name email');

        queue.currentToken = nextTokenId;
        queue.waitingList.shift();
        await queue.save();

        return sendSuccess(res, 200, 'Next token called successfully', {
            calledToken: {
                id: calledToken._id,
                tokenNumber: calledToken.tokenNumber,
                status: calledToken.status,
                student: calledToken.student,
                calledAt: calledToken.calledAt,
            },
            remainingWaiting: queue.waitingList.length,
        });
    } catch (error) {
        console.error('Call next error:', error.message);
        return sendError(res, 500, 'Server error while calling next token');
    }
};

const completeToken = async (req, res) => {
    try {
        const queue = await getOrInitQueue(req.params.serviceId);

        if (!queue.currentToken) {
            return sendError(res, 400, 'No token is currently being served');
        }

        const tokenId = queue.currentToken._id;

        const completedToken = await Token.findByIdAndUpdate(
            tokenId,
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        ).populate('student', 'name email');

        queue.currentToken = null;
        queue.totalServedToday += 1;
        await queue.save();

        return sendSuccess(res, 200, 'Token marked as completed', {
            completedToken: {
                id: completedToken._id,
                tokenNumber: completedToken.tokenNumber,
                status: completedToken.status,
                student: completedToken.student,
                completedAt: completedToken.completedAt,
            },
            totalServedToday: queue.totalServedToday,
            remainingWaiting: queue.waitingList.length,
        });
    } catch (error) {
        console.error('Complete token error:', error.message);
        return sendError(res, 500, 'Server error while completing token');
    }
};

const skipToken = async (req, res) => {
    try {
        const queue = await getOrInitQueue(req.params.serviceId);

        if (!queue.currentToken) {
            return sendError(res, 400, 'No token is currently being served');
        }

        const tokenId = queue.currentToken._id;

        const missedToken = await Token.findByIdAndUpdate(
            tokenId,
            {
                $set: {
                    status: 'missed',
                    missedAt: new Date(),
                },
            },
            { returnDocument: 'after' }
        ).populate('student', 'name email');

        queue.currentToken = null;
        await queue.save();

        return sendSuccess(res, 200, 'Token skipped and marked as missed', {
            missedToken: {
                id: missedToken._id,
                tokenNumber: missedToken.tokenNumber,
                status: missedToken.status,
                student: missedToken.student,
                missedAt: missedToken.missedAt,
            },
            remainingWaiting: queue.waitingList.length,
        });
    } catch (error) {
        console.error('Skip token error:', error.message);
        return sendError(res, 500, 'Server error while skipping token');
    }
};

const pauseQueue = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const queue = await getOrInitQueue(req.params.serviceId);

        if (queue.isPaused) {
            return sendError(res, 400, 'Queue is already paused');
        }

        queue.isPaused = true;
        await queue.save();

        return sendSuccess(res, 200, `Queue paused for ${service.name}`, {
            queue: {
                service: service.name,
                isPaused: queue.isPaused,
                waitingCount: queue.waitingList.length,
                currentToken: queue.currentToken
                    ? queue.currentToken.tokenNumber
                    : null,
            },
        });
    } catch (error) {
        console.error('Pause queue error:', error.message);
        return sendError(res, 500, 'Server error while pausing queue');
    }
};

const resumeQueue = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const queue = await getOrInitQueue(req.params.serviceId);

        if (!queue.isPaused) {
            return sendError(res, 400, 'Queue is not paused');
        }

        queue.isPaused = false;
        await queue.save();

        return sendSuccess(res, 200, `Queue resumed for ${service.name}`, {
            queue: {
                service: service.name,
                isPaused: queue.isPaused,
                waitingCount: queue.waitingList.length,
                currentToken: queue.currentToken
                    ? queue.currentToken.tokenNumber
                    : null,
            },
        });
    } catch (error) {
        console.error('Resume queue error:', error.message);
        return sendError(res, 500, 'Server error while resuming queue');
    }
};

module.exports = { callNext, completeToken, skipToken, pauseQueue, resumeQueue };