const Token = require('../models/Token');
const Service = require('../models/Service');
const Counter = require('../models/Counter');
const { getTodayDate } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/response');

const getDailyAnalytics = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    // Aggregation pipeline — group tokens by service for a given date
    const dailyStats = await Token.aggregate([
      {
        $match: {
          bookedDate: date,
        },
      },
      {
        $group: {
          _id: '$service',
          totalBooked: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          waiting: {
            $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] },
          },
          called: {
            $sum: { $cond: [{ $eq: ['$status', 'called'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo',
        },
      },
      {
        $unwind: '$serviceInfo',
      },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$serviceInfo.name',
          servicePrefix: '$serviceInfo.prefix',
          dailyLimit: '$serviceInfo.dailyLimit',
          totalBooked: 1,
          completed: 1,
          missed: 1,
          cancelled: 1,
          waiting: 1,
          called: 1,
          completionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$completed', { $max: ['$totalBooked', 1] }] },
                  100,
                ],
              },
              2,
            ],
          },
          missRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$missed', { $max: ['$totalBooked', 1] }] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: { totalBooked: -1 },
      },
    ]);

    // Overall totals
    const totals = dailyStats.reduce(
      (acc, s) => {
        acc.totalBooked += s.totalBooked;
        acc.completed += s.completed;
        acc.missed += s.missed;
        acc.cancelled += s.cancelled;
        acc.waiting += s.waiting;
        return acc;
      },
      { totalBooked: 0, completed: 0, missed: 0, cancelled: 0, waiting: 0 }
    );

    return sendSuccess(res, 200, 'Daily analytics fetched successfully', {
      date,
      totals,
      services: dailyStats,
    });
  } catch (error) {
    console.error('Daily analytics error:', error.message);
    return sendError(res, 500, 'Server error while fetching daily analytics');
  }
};

const getAvgWaitTime = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    // Only completed tokens have both calledAt and completedAt
    const waitTimeStats = await Token.aggregate([
      {
        $match: {
          bookedDate: date,
          status: 'completed',
          calledAt: { $exists: true },
          completedAt: { $exists: true },
        },
      },
      {
        $addFields: {
          // Processing time in minutes (completedAt - calledAt)
          processingTimeMinutes: {
            $divide: [
              { $subtract: ['$completedAt', '$calledAt'] },
              60000, // convert ms to minutes
            ],
          },
          // Wait time in minutes (calledAt - createdAt)
          waitTimeMinutes: {
            $divide: [
              { $subtract: ['$calledAt', '$createdAt'] },
              60000,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$service',
          avgProcessingTime: { $avg: '$processingTimeMinutes' },
          avgWaitTime: { $avg: '$waitTimeMinutes' },
          maxWaitTime: { $max: '$waitTimeMinutes' },
          minWaitTime: { $min: '$waitTimeMinutes' },
          totalCompleted: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'services',
          localField: '_id',
          foreignField: '_id',
          as: 'serviceInfo',
        },
      },
      {
        $unwind: '$serviceInfo',
      },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: '$serviceInfo.name',
          servicePrefix: '$serviceInfo.prefix',
          configuredAvgTime: '$serviceInfo.avgProcessTime',
          totalCompleted: 1,
          avgProcessingTime: { $round: ['$avgProcessingTime', 2] },
          avgWaitTime: { $round: ['$avgWaitTime', 2] },
          maxWaitTime: { $round: ['$maxWaitTime', 2] },
          minWaitTime: { $round: ['$minWaitTime', 2] },
        },
      },
      {
        $sort: { avgWaitTime: -1 },
      },
    ]);

    return sendSuccess(res, 200, 'Average wait time analytics fetched', {
      date,
      services: waitTimeStats,
    });
  } catch (error) {
    console.error('Wait time analytics error:', error.message);
    return sendError(res, 500, 'Server error while fetching wait time analytics');
  }
};

const getPeakHours = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();
    const serviceId = req.query.serviceId || null;

    const matchStage = { bookedDate: date };
    if (serviceId) matchStage.service = require('mongoose').Types.ObjectId(serviceId);

    const peakHours = await Token.aggregate([
      {
        $match: matchStage,
      },
      {
        // Extract hour from createdAt timestamp
        $addFields: {
          hour: { $hour: '$createdAt' },
        },
      },
      {
        $group: {
          _id: '$hour',
          tokenCount: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          // Format hour as readable time range e.g. "09:00 - 10:00"
          timeSlot: {
            $concat: [
              {
                $cond: [
                  { $lt: ['$_id', 10] },
                  { $concat: ['0', { $toString: '$_id' }] },
                  { $toString: '$_id' },
                ],
              },
              ':00 - ',
              {
                $cond: [
                  { $lt: [{ $add: ['$_id', 1] }, 10] },
                  { $concat: ['0', { $toString: { $add: ['$_id', 1] } }] },
                  { $toString: { $add: ['$_id', 1] } },
                ],
              },
              ':00',
            ],
          },
          tokenCount: 1,
          completed: 1,
          missed: 1,
        },
      },
      {
        $sort: { hour: 1 },
      },
    ]);

    // Find the busiest hour
    const busiestHour = peakHours.reduce(
      (max, h) => (h.tokenCount > max.tokenCount ? h : max),
      { tokenCount: 0 }
    );

    return sendSuccess(res, 200, 'Peak hours analytics fetched', {
      date,
      busiestHour,
      hourlyBreakdown: peakHours,
    });
  } catch (error) {
    console.error('Peak hours error:', error.message);
    return sendError(res, 500, 'Server error while fetching peak hours');
  }
};

const getDateRangeAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Build array of last N dates
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const rangeStats = await Token.aggregate([
      {
        $match: {
          bookedDate: { $in: dates },
        },
      },
      {
        $group: {
          _id: '$bookedDate',
          totalBooked: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalBooked: 1,
          completed: 1,
          missed: 1,
          cancelled: 1,
          completionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$completed', { $max: ['$totalBooked', 1] }] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: { date: -1 },
      },
    ]);

    return sendSuccess(res, 200, 'Date range analytics fetched', {
      days,
      dateRange: {
        from: dates[dates.length - 1],
        to: dates[0],
      },
      dailyBreakdown: rangeStats,
    });
  } catch (error) {
    console.error('Date range analytics error:', error.message);
    return sendError(res, 500, 'Server error while fetching range analytics');
  }
};

module.exports = { getDailyAnalytics, getAvgWaitTime, getPeakHours, getDateRangeAnalytics, };