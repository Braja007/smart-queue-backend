const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
    {
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true,
            unique: true,
        },
        currentToken: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Token',
            default: null,
        },
        waitingList: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Token',
            },
        ],
        isPaused: {
            type: Boolean,
            default: false,
        },
        totalServedToday: {
            type: Number,
            default: 0,
        },
        lastResetDate: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Queue', queueSchema);