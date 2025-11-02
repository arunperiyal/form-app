const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Form submission validation rules
const formValidationRules = [
  body('shortAnswer')
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Short answer must be between 3 and 500 characters')
    .escape(),
  
  body('longAnswer')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Long answer must be between 10 and 5000 characters')
    .escape(),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  
  body('number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Number must be a positive integer'),
  
  body('scale')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Scale must be between 1 and 10'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('time')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  
  body('singleSelect')
    .optional()
    .trim()
    .escape(),
  
  body('dropdown')
    .optional()
    .trim()
    .escape()
];

// Admin login validation
const loginValidationRules = [
  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password is required')
];

module.exports = {
  validate,
  formValidationRules,
  loginValidationRules
};
