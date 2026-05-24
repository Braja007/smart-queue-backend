const Service = require('../models/Service');
const { sendSuccess, sendError } = require('../utils/response');
const { validationResult } = require('express-validator');

const createService = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { name, prefix, dailyLimit, avgProcessTime, description } = req.body;

    try {
        const existing = await Service.findOne({
            $or: [{ name }, { prefix: prefix.toUpperCase() }],
        });

        if (existing) {
            return sendError(res, 409, 'Service with this name or prefix already exists');
        }

        const service = await Service.create({
            name,
            prefix: prefix.toUpperCase(),
            dailyLimit,
            avgProcessTime,
            description,
        });

        return sendSuccess(res, 201, 'Service created successfully', { service });
    } catch (error) {
        console.error('Create service error:', error.message);
        return sendError(res, 500, 'Server error while creating service');
    }
};

const getAllServices = async (req, res) => {
    try {
        const filter = {};

        if (req.user.role === 'student') {
            filter.isActive = true;
        }

        const services = await Service.find(filter).sort({ createdAt: -1 });

        return sendSuccess(res, 200, 'Services fetched successfully', {
            count: services.length,
            services,
        });
    } catch (error) {
        console.error('Get services error:', error.message);
        return sendError(res, 500, 'Server error while fetching services');
    }
};

const getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);

        if (!service) {
            return sendError(res, 404, 'Service not found');
        }

        return sendSuccess(res, 200, 'Service fetched successfully', { service });
    } catch (error) {
        console.error('Get service error:', error.message);
        return sendError(res, 500, 'Server error while fetching service');
    }
};

module.exports = { createService, getAllServices, getServiceById };