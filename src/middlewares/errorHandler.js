const { sendError } = require("../utils/response");

const notFound = (req, res, next) => {
    next({ statusCode: 404, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
    console.error(`[ERROR] ${err.message}`);

    let status = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errors;

    if (err.code == 11000) {
        status = 409;
        message = `${Object.keys(err.keyValue)[0]} already exists`;
    }
    if (err.name === 'ValidationError') {
        status = 400;
        message = 'Validation failed';
        errors = Object.values(err.errors).map(e => e.message);
    }

    if (err.name === 'CastError') {
        status = 400;
        message = `Invalid ID format: ${err.value}`;
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        status = 401;
        message = 'Invalid or expired token';
    }
    return sendError(res, status, message, errors);
};

module.exports = { notFound, errorHandler};