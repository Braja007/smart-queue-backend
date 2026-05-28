const cron = require('node-cron');
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const { getTodayDate } = require('./tokenUtils');

const dailyQueueReset = () => {
    // Runs every day at midnight 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log(`[CRON] Daily queue reset started at ${new Date().toISOString()}`);

        try {
            const today = getTodayDate();

            const queues = await Queue.find({
                lastResetDate: { $ne: today },
            });

            console.log(`[CRON] Found ${queues.length} queues to reset`);

            for (const queue of queues) {
                if (queue.waitingList.length > 0) {
                    const missedCount = await Token.updateMany(
                        {
                            _id: { $in: queue.waitingList },
                            status: { $in: ['waiting', 'called'] },
                        },
                        {
                            $set: {
                                status: 'missed',
                                missedAt: new Date(),
                            },
                        }
                    );
                    console.log(
                        `[CRON] Marked ${missedCount.modifiedCount} tokens as missed for queue ${queue._id}`
                    );
                }

                if (queue.currentToken) {
                    await Token.findByIdAndUpdate(queue.currentToken, {
                        $set: { status: 'missed', missedAt: new Date() },
                    });
                }

                queue.currentToken = null;
                queue.waitingList = [];
                queue.isPaused = false;
                queue.totalServedToday = 0;
                queue.lastResetDate = today;
                await queue.save();

                console.log(`[CRON] Queue reset complete for service ${queue.service}`);
            }

            console.log(`[CRON] Daily reset complete at ${new Date().toISOString()}`);
        } catch (error) {
            console.error('[CRON] Daily reset failed:', error.message);
        }
    });

    console.log('[CRON] Daily queue reset scheduled for midnight');
};

module.exports = { dailyQueueReset };