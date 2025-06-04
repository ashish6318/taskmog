const express = require('express');
const router = express.Router();

// API version and health check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chapter Performance API v1.0.0',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      chapters: '/api/v1/chapters',
      analytics: '/api/v1/chapters/analytics',
      filters: '/api/v1/chapters/filters'
    }
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import route modules
const chapterRoutes = require('./chapters');

// Mount routes
router.use('/chapters', chapterRoutes);

module.exports = router;
