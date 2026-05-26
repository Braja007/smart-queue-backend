const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
    },
    count: {
        type: Number,
        default: 0,
    },
    date: {
        type: String,
        required: true,
    },
    servicePrefix: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('Counter', counterSchema);