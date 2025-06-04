// Response helper functions
const sendResponse = (res, statusCode, success, data, message) => {
  return res.status(statusCode).json({
    success,
    ...(data && { data }),
    ...(message && { message }),
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, statusCode, error, details = null) => {
  return res.status(statusCode).json({
    success: false,
    error,
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });
};

const sendSuccess = (res, data, message = null, statusCode = 200) => {
  return sendResponse(res, statusCode, true, data, message);
};

// Async handler wrapper to catch errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Convert query string booleans to actual booleans
const parseBooleanQuery = (value) => {
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
};

// Sanitize and validate pagination parameters
const getPaginationParams = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit };
};

// Deep clean object - remove undefined/null values
const cleanObject = (obj) => {
  const cleaned = {};
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const cleanedNested = cleanObject(obj[key]);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  }
  return cleaned;
};

// Format error message for client
const formatErrorMessage = (error) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return errors.join(', ');
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return `${field} already exists`;
  }
  
  return error.message || 'An unexpected error occurred';
};

// Generate unique identifier
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Validate MongoDB ObjectId format
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Calculate statistics
const calculateStats = (numbers) => {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return { min: 0, max: 0, avg: 0, sum: 0, count: 0 };
  }
  
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  const count = numbers.length;
  const avg = sum / count;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  
  return { min, max, avg: Math.round(avg * 100) / 100, sum, count };
};

module.exports = {
  sendResponse,
  sendError,
  sendSuccess,
  asyncHandler,
  parseBooleanQuery,
  getPaginationParams,
  cleanObject,
  formatErrorMessage,
  generateId,
  isValidObjectId,
  calculateStats
};
