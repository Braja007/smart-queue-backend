const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Service name is required'],
        trim: true,
        unique: true,
        maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    prefix: {
        type: String,
        required: [true, 'Prefix is required'],
        uppercase: true,
        trim: true,
        unique: true,
        maxlength: [3, 'Prefix cannot exceed 3 characters'],
    },
    dailyLimit: {
        type: Number,
        required: [true, 'Daily limit is required'],
        min: [1, 'Daily limit must be at least 1'],
        default: 100,
    },
    avgProcessTime: {
        type: Number, 
        required: [true, 'Average process time is required'],
        min: [1, 'Process time must be at least 1 minute'],
        default: 5,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [250, 'Description cannot exceed 250 characters'],
    },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);