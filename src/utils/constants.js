// Application constants
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  MULTI_STATUS: 207,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

const SUBJECTS = {
  PHYSICS: 'Physics',
  CHEMISTRY: 'Chemistry',
  MATHEMATICS: 'Mathematics'
};

const CLASSES = {
  CLASS_11: 'Class 11',
  CLASS_12: 'Class 12'
};

const CHAPTER_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed'
};

const CACHE_KEYS = {
  CHAPTERS: 'chapters',
  CHAPTER: 'chapter',
  ANALYTICS: 'analytics',
  FILTERS: 'filters'
};

const CACHE_TTL = {
  SHORT: 300,    // 5 minutes
  MEDIUM: 1800,  // 30 minutes
  LONG: 3600,    // 1 hour
  EXTENDED: 7200 // 2 hours
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format provided',
  INVALID_ENUM: 'Invalid value. Must be one of: ',
  MIN_LENGTH: 'Must be at least {min} characters long',
  MAX_LENGTH: 'Must be no more than {max} characters long',
  POSITIVE_NUMBER: 'Must be a positive number',
  NON_NEGATIVE_NUMBER: 'Must be a non-negative number',
  BOOLEAN_VALUE: 'Must be true or false',
  OBJECT_ID: 'Invalid ID format'
};

const ERROR_MESSAGES = {
  CHAPTER_NOT_FOUND: 'Chapter not found',
  INVALID_JSON: 'Invalid JSON format',
  FILE_TOO_LARGE: 'File too large. Maximum size is 5MB',
  UNSUPPORTED_FILE_TYPE: 'Unsupported file type. Only JSON files are allowed',
  NO_DATA_PROVIDED: 'No data provided',
  EMPTY_ARRAY: 'Data array cannot be empty',
  NO_VALID_CHAPTERS: 'No valid chapters found in the data',
  DATABASE_ERROR: 'Database operation failed',
  CACHE_ERROR: 'Cache operation failed',
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INTERNAL_ERROR: 'Internal server error occurred'
};

const SUCCESS_MESSAGES = {
  CHAPTER_CREATED: 'Chapter created successfully',
  CHAPTERS_UPLOADED: 'Chapters uploaded successfully',
  CHAPTER_UPDATED: 'Chapter updated successfully',
  CHAPTER_DELETED: 'Chapter deleted successfully',
  DATA_RETRIEVED: 'Data retrieved successfully'
};

const API_ENDPOINTS = {
  BASE: '/api/v1',
  CHAPTERS: '/api/v1/chapters',
  CHAPTER_BY_ID: '/api/v1/chapters/:id',
  ANALYTICS: '/api/v1/chapters/analytics',
  FILTERS: '/api/v1/chapters/filters',
  HEALTH: '/api/v1/health'
};

const YEARS = {
  MIN_YEAR: 2015,
  MAX_YEAR: 2030,
  AVAILABLE_YEARS: ['2019', '2020', '2021', '2022', '2023', '2024', '2025']
};

module.exports = {
  HTTP_STATUS,
  SUBJECTS,
  CLASSES,
  CHAPTER_STATUS,
  CACHE_KEYS,
  CACHE_TTL,
  PAGINATION,
  VALIDATION_MESSAGES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_ENDPOINTS,
  YEARS
};
