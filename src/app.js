const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import configurations
const connectDB = require('./config/database');
const { connectRedis } = require('./config/redis');

// Import middleware
const createRateLimiter = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const routes = require('./routes');

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }
  setupMiddleware() {
    // Security middleware with relaxed CSP for testing
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          scriptSrcElem: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          connectSrc: ["'self'", "http://localhost:3000", "http://127.0.0.1:3000"],
          fontSrc: ["'self'", "https:", "data:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    }));// CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com']
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'file://'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression middleware
    this.app.use(compression());

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting (apply to all routes)
    this.app.use(createRateLimiter());    // Request logging middleware (only in development)
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
        });
        
        next();
      });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const fs = require('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }
  setupRoutes() {
    // Serve static test files
    this.app.use('/test', express.static(path.join(__dirname, '..')));
    
    // Root endpoint
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Chapter Performance Dashboard API',
        version: '1.0.0',
        documentation: '/api/v1',
        health: '/api/v1/health',
        testInterface: '/test/test-web-ui.html',
        timestamp: new Date().toISOString()
      });
    });

    // API routes
    this.app.use('/api/v1', routes);

    // Handle favicon requests
    this.app.get('/favicon.ico', (req, res) => res.status(204).end());
  }

  setupErrorHandling() {
    // Handle 404 errors
    this.app.use(notFound);

    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', err);
      process.exit(1);
    });
  }  async initialize() {
    try {
      // Connect to databases (non-blocking)
      const dbConnected = await connectDB();
      const redisConnected = await connectRedis();
      
      return this.app;
    } catch (error) {
      return this.app;
    }
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;
