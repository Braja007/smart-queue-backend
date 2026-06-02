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

const getMostCrowdedOffice = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    const crowdedStats = await Token.aggregate([
      {
        $match: { bookedDate: date },
      },
      {
        $group: {
          _id: '$service',
          totalBooked: { $sum: 1 },
          waiting: {
            $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
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
          waiting: 1,
          completed: 1,
          missed: 1,
          // Crowding score = totalBooked / dailyLimit * 100
          crowdingPercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      '$totalBooked',
                      { $max: ['$serviceInfo.dailyLimit', 1] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: { crowdingPercentage: -1 },
      },
    ]);

    const mostCrowded = crowdedStats[0] || null;
    const leastCrowded = crowdedStats[crowdedStats.length - 1] || null;

    return sendSuccess(res, 200, 'Most crowded office analytics fetched', {
      date,
      mostCrowded,
      leastCrowded,
      ranking: crowdedStats,
    });
  } catch (error) {
    console.error('Most crowded error:', error.message);
    return sendError(res, 500, 'Server error while fetching crowded office data');
  }
};

const getOfficeComparison = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    // Build date range
    const dates = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const comparison = await Token.aggregate([
      {
        $match: {
          bookedDate: { $in: dates },
        },
      },
      {
        $group: {
          _id: '$service',
          totalBooked: { $sum: 1 },
          totalCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalMissed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          totalCancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          // Avg processing time for completed tokens
          avgProcessingTime: {
            $avg: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status', 'completed'] },
                    { $ifNull: ['$calledAt', false] },
                    { $ifNull: ['$completedAt', false] },
                  ],
                },
                {
                  $divide: [
                    { $subtract: ['$completedAt', '$calledAt'] },
                    60000,
                  ],
                },
                null,
              ],
            },
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
          configuredAvgTime: '$serviceInfo.avgProcessTime',
          period: `Last ${days} days`,
          totalBooked: 1,
          totalCompleted: 1,
          totalMissed: 1,
          totalCancelled: 1,
          avgProcessingTime: { $round: ['$avgProcessingTime', 2] },
          completionRate: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      '$totalCompleted',
                      { $max: ['$totalBooked', 1] },
                    ],
                  },
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
                  {
                    $divide: [
                      '$totalMissed',
                      { $max: ['$totalBooked', 1] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
          // Efficiency: how close actual time is to configured time
          efficiencyScore: {
            $round: [
              {
                $multiply: [
                  {
                    $subtract: [
                      1,
                      {
                        $abs: {
                          $divide: [
                            {
                              $subtract: [
                                '$avgProcessingTime',
                                '$serviceInfo.avgProcessTime',
                              ],
                            },
                            { $max: ['$serviceInfo.avgProcessTime', 1] },
                          ],
                        },
                      },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      {
        $sort: { completionRate: -1 },
      },
    ]);

    // Best and worst performing offices
    const bestPerforming = comparison[0] || null;
    const worstPerforming = comparison[comparison.length - 1] || null;

    // Overall summary across all offices
    const summary = comparison.reduce(
      (acc, office) => {
        acc.totalBooked += office.totalBooked;
        acc.totalCompleted += office.totalCompleted;
        acc.totalMissed += office.totalMissed;
        return acc;
      },
      { totalBooked: 0, totalCompleted: 0, totalMissed: 0 }
    );

    summary.overallCompletionRate =
      summary.totalBooked > 0
        ? ((summary.totalCompleted / summary.totalBooked) * 100).toFixed(2)
        : 0;

    return sendSuccess(res, 200, 'Office comparison analytics fetched', {
      period: `Last ${days} days`,
      dateRange: {
        from: dates[dates.length - 1],
        to: dates[0],
      },
      summary,
      bestPerforming,
      worstPerforming,
      offices: comparison,
    });
  } catch (error) {
    console.error('Office comparison error:', error.message);
    return sendError(res, 500, 'Server error while fetching office comparison');
  }
};

const getStudentInsights = async (req, res) => {
  try {
    const date = req.query.date || getTodayDate();

    const insights = await Token.aggregate([
      {
        $match: { bookedDate: date },
      },
      {
        $group: {
          _id: '$student',
          totalTokens: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] },
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          rejoined: {
            $sum: { $cond: ['$isRejoined', 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      {
        $unwind: '$studentInfo',
      },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          studentName: '$studentInfo.name',
          studentEmail: '$studentInfo.email',
          totalTokens: 1,
          completed: 1,
          missed: 1,
          cancelled: 1,
          rejoined: 1,
        },
      },
      {
        $sort: { totalTokens: -1 },
      },
    ]);

    // Summary stats
    const totalStudents = insights.length;
    const studentsWithMiss = insights.filter((s) => s.missed > 0).length;
    const studentsWithRejoin = insights.filter((s) => s.rejoined > 0).length;

    return sendSuccess(res, 200, 'Student insights fetched', {
      date,
      summary: {
        totalStudents,
        studentsWithMiss,
        studentsWithRejoin,
        missRate:
          totalStudents > 0
            ? ((studentsWithMiss / totalStudents) * 100).toFixed(2)
            : 0,
      },
      students: insights,
    });
  } catch (error) {
    console.error('Student insights error:', error.message);
    return sendError(res, 500, 'Server error while fetching student insights');
  }
};

module.exports = {
    getDailyAnalytics, getAvgWaitTime, getPeakHours, getDateRangeAnalytics, getMostCrowdedOffice, getStudentInsights, getOfficeComparison,
};