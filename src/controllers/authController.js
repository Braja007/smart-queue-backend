const User = require("../models/User");
const { sendSuccess, sendError } = require("../utils/response");

const signup = async (req, res, next) => {
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
        next(error);
    }
};

module.exports = { signup };