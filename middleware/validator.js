const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

const studentValidation = [
    body('rollNo').trim().notEmpty().withMessage('Roll Number is required').toUpperCase(),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('college').notEmpty().withMessage('College is required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Valid year is required'),
    body('branch').notEmpty().withMessage('Branch is required'),
    body('phoneNo').isMobilePhone().withMessage('Valid Phone Number is required'),
    body('parentPhoneNo').isMobilePhone().withMessage('Valid Parent Phone Number is required'),
    validate
];

const authValidation = [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validate
];

module.exports = {
    studentValidation,
    authValidation,
    validate
};
