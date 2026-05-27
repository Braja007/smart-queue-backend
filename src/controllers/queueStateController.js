const Queue = require('../models/Queue');
const Service = require('../models/Service');
const Token = require('../models/Token');
const { getOrInitQueue } = require('../utils/queueUtils');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');

const initQueue = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const existing = await Queue.findOne({ service: req.params.serviceId });
        if (existing) {
            return sendError(res, 409, 'Queue already initialized for this service');
        }

        const queue = await Queue.create({
            service: req.params.serviceId,
            currentToken: null,
            waitingList: [],
            isPaused: false,
            totalServedToday: 0,
            lastResetDate: getTodayDate(),
        });

        return sendSuccess(res, 201, `Queue initialized for ${service.name}`, {
            queue: {
                id: queue._id,
                service: service.name,
                isPaused: queue.isPaused,
                waitingCount: 0,
                lastResetDate: queue.lastResetDate,
            },
        });
    } catch (error) {
        console.error('Init queue error:', error.message);
        return sendError(res, 500, 'Server error while initializing queue');
    }
};

const getQueueState = async (req, res) => {
    try {
        const service = await Service.findById(req.params.serviceId);
        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        const queue = await getOrInitQueue(req.params.serviceId);
        const today = getTodayDate();

        const completedToday = await Token.countDocuments({
            service: req.params.serviceId,
            bookedDate: today,
            status: 'completed',
        });

        return sendSuccess(res, 200, 'Queue state fetched successfully', {
            queue: {
                id: queue._id,
                service: {
                    id: service._id,
                    name: service.name,
                    prefix: service.prefix,
                    avgProcessTime: service.avgProcessTime,
                },
                isPaused: queue.isPaused,
                currentToken: queue.currentToken
                    ? {
                        id: queue.currentToken._id,
                        tokenNumber: queue.currentToken.tokenNumber,
                        status: queue.currentToken.status,
                        student: queue.currentToken.student,
                        calledAt: queue.currentToken.calledAt,
                    }
                    : null,
                waitingList: queue.waitingList.map((t) => ({
                    id: t._id,
                    tokenNumber: t.tokenNumber,
                    student: t.student,
                    queuePosition: t.queuePosition,
                    bookedAt: t.createdAt,
                })),
                stats: {
                    waitingCount: queue.waitingList.length,
                    completedToday,
                    totalServedToday: queue.totalServedToday,
                },
            },
        });
    } catch (error) {
        console.error('Get queue state error:', error.message);
        return sendError(res, 500, 'Server error while fetching queue state');
    }
};

const getQueuesOverview = async (req, res) => {
    try {
        const services = await Service.find({ isActive: true });

        const overviews = await Promise.all(
            services.map(async (service) => {
                const queue = await getOrInitQueue(service._id);
                const today = getTodayDate();

                const completedToday = await Token.countDocuments({
                    service: service._id,
                    bookedDate: today,
                    status: 'completed',
                });

                return {
                    service: {
                        id: service._id,
                        name: service.name,
                        prefix: service.prefix,
                    },
                    isPaused: queue.isPaused,
                    currentToken: queue.currentToken
                        ? queue.currentToken.tokenNumber
                        : null,
                    waitingCount: queue.waitingList.length,
                    completedToday,
                    remainingSlots: service.dailyLimit - queue.totalServedToday,
                };
            })
        );

        return sendSuccess(res, 200, 'Queues overview fetched', {
            date: getTodayDate(),
            totalServices: services.length,
            queues: overviews,
        });
    } catch (error) {
        console.error('Get overview error:', error.message);
        return sendError(res, 500, 'Server error while fetching overview');
    }
};

module.exports = { initQueue, getQueueState, getQueuesOverview };