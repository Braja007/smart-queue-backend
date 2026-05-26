const Counter = require('../models/Counter');

const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

const getCounterKey = (servicePrefix) => {
    return `${servicePrefix}-${getTodayDate()}`;
};

const generateTokenNumber = async (servicePrefix) => {
    const key = getCounterKey(servicePrefix);
    const today = getTodayDate();

    const counter = await Counter.findOneAndUpdate(
        { key },
        {
            $inc: { count: 1 },
            $setOnInsert: { date: today, servicePrefix },
        },
        { upsert: true, returnDocument: 'after' }
    );

    const formatted = String(counter.count).padStart(3, '0');

    return `${servicePrefix}${formatted}`;
};

const getTodayCount = async (servicePrefix) => {
    const key = getCounterKey(servicePrefix);
    const counter = await Counter.findOne({ key });
    return counter ? counter.count : 0;
};

module.exports = { generateTokenNumber, getTodayCount, getTodayDate };