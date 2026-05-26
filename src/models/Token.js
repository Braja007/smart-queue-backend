const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema(
    {
        tokenNumber: {
            type: String,
            required: true,
        },
        service: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Service',
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['waiting', 'called', 'completed', 'missed', 'cancelled'],
            default: 'waiting',
        },
        queuePosition: {
            type: Number,
        },
        calledAt: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        missedAt: {
            type: Date,
        },
        bookedDate: {
            type: String,
            required: true,
        },
        isRejoined: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

tokenSchema.index({ service: 1, bookedDate: 1 });

tokenSchema.index({ student: 1, bookedDate: 1 });

module.exports = mongoose.model('Token', tokenSchema);