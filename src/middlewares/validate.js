const { body, param, query } = require('express-validator');

const signupValidation = [
    body('name')
        .trim()
        .escape()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),

    body('email')
        .trim()
        .normalizeEmail()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

    body('role')
        .optional()
        .isIn(['student', 'staff', 'admin']).withMessage('Role must be student, staff, or admin'),
];

const loginValidation = [
    body('email')
        .trim()
        .normalizeEmail()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email'),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

const serviceValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Service name is required')
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

    body('prefix')
        .trim()
        .notEmpty().withMessage('Prefix is required')
        .isLength({ min: 1, max: 3 }).withMessage('Prefix must be 1 to 3 characters')
        .isAlpha().withMessage('Prefix must contain only letters'),

    body('dailyLimit')
        .notEmpty().withMessage('Daily limit is required')
        .isInt({ min: 1 }).withMessage('Daily limit must be a positive number'),

    body('avgProcessTime')
        .notEmpty().withMessage('Average process time is required')
        .isInt({ min: 1 }).withMessage('Process time must be at least 1 minute'),

    body('description')
        .optional()
        .isLength({ max: 250 }).withMessage('Description cannot exceed 250 characters'),
];

const updateServiceValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

    body('prefix')
        .optional()
        .trim()
        .isLength({ min: 1, max: 3 }).withMessage('Prefix must be 1 to 3 characters')
        .isAlpha().withMessage('Prefix must contain only letters'),

    body('dailyLimit')
        .optional()
        .isInt({ min: 1 }).withMessage('Daily limit must be a positive number'),

    body('avgProcessTime')
        .optional()
        .isInt({ min: 1 }).withMessage('Process time must be at least 1 minute'),

    body('isActive')
        .optional()
        .isBoolean().withMessage('isActive must be true or false'),

    body('description')
        .optional()
        .isLength({ max: 250 }).withMessage('Description cannot exceed 250 characters'),
];

const bookTokenValidation = [
    body('serviceId')
        .notEmpty().withMessage('Service ID is required')
        .isMongoId().withMessage('Invalid service ID format'),
];

const rejoinValidation = [
    body('tokenId')
        .notEmpty().withMessage('Token ID is required')
        .isMongoId().withMessage('Invalid token ID format'),
];

const validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),
];

const validateServiceId = [
  param('serviceId')
    .isMongoId().withMessage('Invalid service ID format'),
];

const validateTokenId = [
  param('tokenId')
    .isMongoId().withMessage('Invalid token ID format'),
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive number'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
];

const analyticsDateValidation = [
  query('date')
    .optional()
    .isDate().withMessage('Date must be in YYYY-MM-DD format'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90'),
];

module.exports = { 
    signupValidation,
    loginValidation, 
    serviceValidation, 
    updateServiceValidation, 
    bookTokenValidation,
    rejoinValidation,
    validateMongoId,
    validateServiceId,
    validateTokenId,
    paginationValidation,
    analyticsDateValidation
};