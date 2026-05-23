const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");
const { validationResult } = require("express-validator");

const signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendError(res, 400, 'Validation failed', errors.array());
    }
    const { name, email, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return sendError(res, 409, 'Email already registered');
        }
        const user = await User.create({ name, email, password, role });
        const userData = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        };
        return sendSuccess(res, 201, 'User registered successfully', userData);
    } catch (error) {
        console.error('Signup error:', error.message);
        return sendError(res, 500, 'Server error during signup');
    }
};

module.exports = { signup };