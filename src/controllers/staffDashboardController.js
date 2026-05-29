const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Service = require('../models/Service');
const { getOrInitQueue } = require('../utils/queueUtils');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');

const getStaffDashboard = async (req, res) => {
    try {
        const today = getTodayDate();

        const services = await Service.find({ isActive: true });

        const serviceQueues = await Promise.all(
            services.map(async (service) => {
                const queue = await getOrInitQueue(service._id);

                const [completedCount, missedCount, cancelledCount, totalBooked] =
                    await Promise.all([
                        Token.countDocuments({
                            service: service._id,
                            bookedDate: today,
                            status: 'completed',
                        }),
                        Token.countDocuments({
                            service: service._id,
                            bookedDate: today,
                            status: 'missed',
                        }),
                        Token.countDocuments({
                            service: service._id,
                            bookedDate: today,
                            status: 'cancelled',
                        }),
                        Token.countDocuments({
                            service: service._id,
                            bookedDate: today,
                        }),
                    ]);

                return {
                    service: {
                        id: service._id,
                        name: service.name,
                        prefix: service.prefix,
                        avgProcessTime: service.avgProcessTime,
                        dailyLimit: service.dailyLimit,
                    },
                    queue: {
                        id: queue._id,
                        isPaused: queue.isPaused,
                        currentToken: queue.currentToken
                            ? {
                                id: queue.currentToken._id,
                                tokenNumber: queue.currentToken.tokenNumber,
                                calledAt: queue.currentToken.calledAt,
                                student: queue.currentToken.student,
                            }
                            : null,
                        waitingCount: queue.waitingList.length,
                        nextToken:
                            queue.waitingList.length > 0
                                ? queue.waitingList[0].tokenNumber
                                : null,
                    },
                    todayStats: {
                        totalBooked,
                        completed: completedCount,
                        missed: missedCount,
                        cancelled: cancelledCount,
                        waiting: queue.waitingList.length,
                        remainingSlots: service.dailyLimit - totalBooked,
                    },
                };
            })
        );

        const overallStats = serviceQueues.reduce(
            (acc, sq) => {
                acc.totalBooked += sq.todayStats.totalBooked;
                acc.totalCompleted += sq.todayStats.completed;
                acc.totalMissed += sq.todayStats.missed;
                acc.totalWaiting += sq.todayStats.waiting;
                acc.totalCancelled += sq.todayStats.cancelled;
                return acc;
            },
            {
                totalBooked: 0,
                totalCompleted: 0,
                totalMissed: 0,
                totalWaiting: 0,
                totalCancelled: 0,
            }
        );

        return sendSuccess(res, 200, 'Staff dashboard fetched successfully', {
            staff: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role,
            },
            date: today,
            overallStats,
            serviceQueues,
        });
    } catch (error) {
        console.error('Staff dashboard error:', error.message);
        return sendError(res, 500, 'Server error while fetching staff dashboard');
    }
};

const getActiveQueueList = async (req, res) => {
    try {
        const today = getTodayDate();

        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const queue = await getOrInitQueue(req.params.serviceId);

        const waitingTokens = await Token.find({
            service: req.params.serviceId,
            bookedDate: today,
            status: 'waiting',
        })
            .populate('student', 'name email')
            .sort({ createdAt: 1 });

        return sendSuccess(res, 200, 'Active queue list fetched', {
            service: {
                id: service._id,
                name: service.name,
                prefix: service.prefix,
                avgProcessTime: service.avgProcessTime,
            },
            queue: {
                isPaused: queue.isPaused,
                currentToken: queue.currentToken
                    ? {
                        id: queue.currentToken._id,
                        tokenNumber: queue.currentToken.tokenNumber,
                        calledAt: queue.currentToken.calledAt,
                        student: queue.currentToken.student,
                    }
                    : null,
            },
            waitingList: waitingTokens.map((t, index) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                position: index + 1,
                student: t.student,
                estimatedWaitTime: `${index * service.avgProcessTime} minutes`,
                bookedAt: t.createdAt,
                isRejoined: t.isRejoined,
            })),
            totalWaiting: waitingTokens.length,
        });
    } catch (error) {
        console.error('Active queue list error:', error.message);
        return sendError(res, 500, 'Server error while fetching queue list');
    }
};

const getTodayProcessed = async (req, res) => {
    try {
        const today = getTodayDate();

        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const processedTokens = await Token.find({
            service: req.params.serviceId,
            bookedDate: today,
            status: 'completed',
        })
            .populate('student', 'name email')
            .sort({ completedAt: -1 });

        let avgTime = 0;
        const tokensWithTime = processedTokens.filter(
            (t) => t.calledAt && t.completedAt
        );

        if (tokensWithTime.length > 0) {
            const totalTime = tokensWithTime.reduce((acc, t) => {
                const diff = new Date(t.completedAt) - new Date(t.calledAt);
                return acc + diff / 1000 / 60;
            }, 0);
            avgTime = (totalTime / tokensWithTime.length).toFixed(2);
        }

        return sendSuccess(res, 200, 'Processed tokens fetched', {
            service: {
                id: service._id,
                name: service.name,
                prefix: service.prefix,
            },
            date: today,
            totalProcessed: processedTokens.length,
            averageProcessingTime: `${avgTime} minutes`,
            processedTokens: processedTokens.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                student: t.student,
                calledAt: t.calledAt,
                completedAt: t.completedAt,
            })),
        });
    } catch (error) {
        console.error('Today processed error:', error.message);
        return sendError(res, 500, 'Server error while fetching processed tokens');
    }
};

const getMissedTokensList = async (req, res) => {
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

        const rejoinedCount = missedTokens.filter((t) => t.isRejoined).length;

        return sendSuccess(res, 200, 'Missed tokens list fetched', {
            service: {
                id: service._id,
                name: service.name,
                prefix: service.prefix,
            },
            date: today,
            totalMissed: missedTokens.length,
            rejoinedCount,
            missedTokens: missedTokens.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                student: t.student,
                missedAt: t.missedAt,
                isRejoined: t.isRejoined,
            })),
        });
    } catch (error) {
        console.error('Missed tokens list error:', error.message);
        return sendError(res, 500, 'Server error while fetching missed tokens');
    }
};

module.exports = { getStaffDashboard, getActiveQueueList, getTodayProcessed, getMissedTokensList, };