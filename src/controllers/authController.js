const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");
const { validationResult } = require("express-validator");
const generateToken = require("../utils/generateToken");

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
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendError(res, 400, 'Validation failed', errors.array());
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return sendError(res, 401, 'Invalid email or password');
        }

        if (!user.isActive) {
            return sendError(res, 403, 'Your account has been deactivated');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return sendError(res, 401, 'Invalid email or password');
        }

        const token = generateToken({
            id: user._id,
            role: user.role,
        });

        return sendSuccess(res, 200, 'Login successful', {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Login error:', error.message);
        return sendError(res, 500, 'Server error during login');
    }
};

const getMe = async (req, res) => {
  return sendSuccess(res, 200, 'User profile fetched', {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      createdAt: req.user.createdAt,
    },
  });
};

module.exports = { signup, login, getMe };