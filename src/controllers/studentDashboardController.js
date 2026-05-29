const Token = require('../models/Token');
const Queue = require('../models/Queue');
const Service = require('../models/Service');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');

const getStudentDashboard = async (req, res) => {
    try {
        const studentId = req.user._id;
        const today = getTodayDate();

        const activeTokens = await Token.find({
            student: studentId,
            bookedDate: today,
            status: { $in: ['waiting', 'called'] },
        }).populate('service', 'name prefix avgProcessTime');

        const activeTokensWithPosition = await Promise.all(
            activeTokens.map(async (token) => {
                const queue = await Queue.findOne({ service: token.service._id });

                let peopleAhead = 0;
                let queuePosition = 0;
                let isCurrentlyBeingServed = false;

                if (queue) {
                    if (queue.currentToken && queue.currentToken.toString() === token._id.toString()) {
                        isCurrentlyBeingServed = true;
                        peopleAhead = 0;
                        queuePosition = 0;
                    } else {
                        const waitingIds = queue.waitingList.map((id) => id.toString());
                        const positionIndex = waitingIds.indexOf(token._id.toString());
                        if (positionIndex !== -1) {
                            peopleAhead = positionIndex;
                            queuePosition = positionIndex + 1;
                        }
                    }
                }

                const estimatedWaitTime = peopleAhead * token.service.avgProcessTime;

                return {
                    id: token._id,
                    tokenNumber: token.tokenNumber,
                    service: token.service.name,
                    servicePrefix: token.service.prefix,
                    status: token.status,
                    queuePosition,
                    peopleAhead,
                    estimatedWaitTime: `${estimatedWaitTime} minutes`,
                    isCurrentlyBeingServed,
                    bookedAt: token.createdAt,
                };
            })
        );

        const [waitingCount, completedCount, missedCount, cancelledCount] =
            await Promise.all([
                Token.countDocuments({ student: studentId, bookedDate: today, status: 'waiting' }),
                Token.countDocuments({ student: studentId, bookedDate: today, status: 'completed' }),
                Token.countDocuments({ student: studentId, bookedDate: today, status: 'missed' }),
                Token.countDocuments({ student: studentId, bookedDate: today, status: 'cancelled' }),
            ]);

        const bookedServiceIds = await Token.find({
            student: studentId,
            bookedDate: today,
            status: { $in: ['waiting', 'called'] },
        }).distinct('service');

        const availableServices = await Service.find({
            isActive: true,
            _id: { $nin: bookedServiceIds },
        }).select('name prefix dailyLimit avgProcessTime');

        const recentHistory = await Token.find({
            student: studentId,
            bookedDate: { $ne: today },
        })
            .populate('service', 'name prefix')
            .sort({ createdAt: -1 })
            .limit(10);

        return sendSuccess(res, 200, 'Student dashboard fetched successfully', {
            student: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
            },
            today: {
                date: today,
                summary: {
                    waiting: waitingCount,
                    completed: completedCount,
                    missed: missedCount,
                    cancelled: cancelledCount,
                    total: waitingCount + completedCount + missedCount + cancelledCount,
                },
                activeTokens: activeTokensWithPosition,
            },
            availableServices: availableServices.map((s) => ({
                id: s._id,
                name: s.name,
                prefix: s.prefix,
                avgProcessTime: `${s.avgProcessTime} minutes`,
            })),
            recentHistory: recentHistory.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                service: t.service.name,
                status: t.status,
                bookedDate: t.bookedDate,
                isRejoined: t.isRejoined,
            })),
        });
    } catch (error) {
        console.error('Student dashboard error:', error.message);
        return sendError(res, 500, 'Server error while fetching dashboard');
    }
};

const getTokenHistory = async (req, res) => {
    try {
        const studentId = req.user._id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = { student: studentId };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.date) filter.bookedDate = req.query.date;
        if (req.query.serviceId) filter.service = req.query.serviceId;

        const tokens = await Token.find(filter)
            .populate('service', 'name prefix')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Token.countDocuments(filter);

        return sendSuccess(res, 200, 'Token history fetched successfully', {
            tokens: tokens.map((t) => ({
                id: t._id,
                tokenNumber: t.tokenNumber,
                service: t.service.name,
                servicePrefix: t.service.prefix,
                status: t.status,
                bookedDate: t.bookedDate,
                bookedAt: t.createdAt,
                completedAt: t.completedAt || null,
                missedAt: t.missedAt || null,
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
        console.error('Token history error:', error.message);
        return sendError(res, 500, 'Server error while fetching token history');
    }
};

module.exports = { getStudentDashboard, getTokenHistory };