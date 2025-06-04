const { body, query, param, validationResult } = require('express-validator');

// Validation rules for chapter creation/update
const chapterValidationRules = () => {
  return [
    body('subject')
      .isIn(['Physics', 'Chemistry', 'Mathematics'])
      .withMessage('Subject must be Physics, Chemistry, or Mathematics'),
    body('chapter')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Chapter name must be between 1 and 200 characters'),
    body('class')
      .isIn(['Class 11', 'Class 12'])
      .withMessage('Class must be Class 11 or Class 12'),
    body('unit')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Unit must be between 1 and 100 characters'),
    body('questionSolved')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Questions solved must be a non-negative integer'),
    body('status')
      .optional()
      .isIn(['Not Started', 'In Progress', 'Completed'])
      .withMessage('Status must be Not Started, In Progress, or Completed'),
    body('isWeakChapter')
      .optional()
      .isBoolean()
      .withMessage('isWeakChapter must be a boolean'),
    body('yearWiseQuestionCount')
      .optional()
      .isObject()
      .withMessage('yearWiseQuestionCount must be an object')
  ];
};

// Validation rules for query parameters
const queryValidationRules = () => {
  return [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('subject')
      .optional()
      .isIn(['Physics', 'Chemistry', 'Mathematics'])
      .withMessage('Subject must be Physics, Chemistry, or Mathematics'),
    query('class')
      .optional()
      .isIn(['Class 11', 'Class 12'])
      .withMessage('Class must be Class 11 or Class 12'),
    query('status')
      .optional()
      .isIn(['Not Started', 'In Progress', 'Completed'])
      .withMessage('Status must be Not Started, In Progress, or Completed'),
    query('weakChapters')
      .optional()
      .isBoolean()
      .withMessage('weakChapters must be true or false'),
    query('unit')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Unit must be between 1 and 100 characters')
  ];
};

// Validation for ObjectId parameters
const objectIdValidationRules = () => {
  return [
    param('id')
      .isMongoId()
      .withMessage('Invalid chapter ID format')
  ];
};

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  chapterValidationRules,
  queryValidationRules,
  objectIdValidationRules,
  handleValidationErrors
};
