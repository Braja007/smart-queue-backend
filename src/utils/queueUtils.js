const Queue = require('../models/Queue');
const Token = require('../models/Token');
const Service = require('../models/Service');
const { getTodayDate } = require('./tokenUtils');

const initializeQueue = async (serviceId) => {
    const existing = await Queue.findOne({ service: serviceId });
    if (existing) return existing;

    const queue = await Queue.create({
        service: serviceId,
        currentToken: null,
        waitingList: [],
        isPaused: false,
        totalServedToday: 0,
        lastResetDate: getTodayDate(),
    });

    return queue;
};

const resetQueueIfNewDay = async (queue) => {
    const today = getTodayDate();

    if (queue.lastResetDate === today) return queue;
    if (queue.waitingList.length > 0) {
        await Token.updateMany(
            {
                _id: { $in: queue.waitingList },
                status: { $in: ['waiting', 'called'] },
            },
            {
                $set: { status: 'missed', missedAt: new Date() },
            }
        );
    }

    queue.currentToken = null;
    queue.waitingList = [];
    queue.isPaused = false;
    queue.totalServedToday = 0;
    queue.lastResetDate = today;

    await queue.save();

    return queue;
};

const getOrInitQueue = async (serviceId) => {
    let queue = await Queue.findOne({ service: serviceId })
        .populate('currentToken')
        .populate('waitingList');

    if (!queue) {
        queue = await initializeQueue(serviceId);
        queue = await Queue.findOne({ service: serviceId })
            .populate('currentToken')
            .populate('waitingList');
    }

    queue = await resetQueueIfNewDay(queue);

    queue = await Queue.findById(queue._id)
        .populate({
            path: 'currentToken',
            populate: { path: 'student', select: 'name email' },
        })
        .populate({
            path: 'waitingList',
            populate: { path: 'student', select: 'name email' },
        });

    return queue;
};

module.exports = { initializeQueue, resetQueueIfNewDay, getOrInitQueue };