# Coding Interview Questions

## Chapter Performance API - Technical Deep Dive

### 🎯 **Code Walkthrough Questions**

---

## 1. **"Walk me through your middleware pipeline"**

### **Answer with Code:**

```javascript
// app.js - Middleware Pipeline Order
class App {
  setupMiddleware() {
    // 1. Security first
    this.app.use(
      helmet({
        /* security headers */
      })
    );

    // 2. CORS for cross-origin requests
    this.app.use(
      cors({
        origin:
          process.env.NODE_ENV === "production"
            ? ["https://your-frontend-domain.com"]
            : ["http://localhost:3000"],
        credentials: true,
      })
    );

    // 3. Compression for performance
    this.app.use(compression());

    // 4. Body parsing for JSON/URL-encoded data
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // 5. Rate limiting to prevent abuse
    this.app.use(createRateLimiter());

    // 6. Request logging (development only)
    if (process.env.NODE_ENV === "development") {
      this.app.use(this.requestLogger);
    }
  }
}
```

**Why this order matters:**

- **Security first**: Helmet protects against common attacks
- **CORS early**: Prevents unauthorized cross-origin requests
- **Body parsing**: Required before route handlers can access request data
- **Rate limiting**: Protects API from abuse
- **Logging last**: Captures final request state

---

## 2. **"Explain your error handling strategy"**

### **Custom Error Class:**

```javascript
// utils/ErrorResponse.js
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguish from programming errors

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;
```

### **Centralized Error Middleware:**

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found with id of ${err.value}`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = new ErrorResponse(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err,
    }),
  });
};
```

**Key Benefits:**

- **Centralized**: Single place to handle all errors
- **Type-specific**: Different handling for different error types
- **Security**: No sensitive data leaked in production
- **Debugging**: Stack traces in development only

---

## 3. **"How does your caching implementation work?"**

### **Cache Service Implementation:**

```javascript
// services/cacheService.js
class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600;
    this.cachePrefix = "chapter-api:";
  }

  async get(key) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return null;

      const cachedData = await redisClient.get(`${this.cachePrefix}${key}`);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null; // Graceful degradation
    }
  }

  async set(key, data, ttl = this.defaultTTL) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      await redisClient.setEx(
        `${this.cachePrefix}${key}`,
        ttl,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  }

  // Smart cache key generation
  generateChaptersListKey(filters, page, limit) {
    const filterStr = Object.keys(filters)
      .sort() // Consistent ordering
      .map((key) => `${key}:${filters[key]}`)
      .join(":");

    return `chapters:${filterStr}:page:${page}:limit:${limit}`;
  }

  generateChapterKey(id) {
    return `chapter:${id}`;
  }

  // Pattern-based invalidation
  async invalidatePattern(pattern) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) return false;

      const keys = await redisClient.keys(`${this.cachePrefix}${pattern}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      console.error("Cache invalidation error:", error);
      return false;
    }
  }
}
```

### **Cache-Aside Pattern in Service:**

```javascript
// services/chapterService.js - Cache-aside implementation
async getAllChapters(filters = {}, page = 1, limit = 10) {
  try {
    // 1. Generate cache key
    const cacheKey = cacheService.generateChaptersListKey(filters, page, limit);

    // 2. Try cache first
    const cachedResult = await cacheService.get(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        cache: { hit: true, key: cacheKey, timestamp: new Date().toISOString() }
      };
    }

    // 3. Cache miss - fetch from database
    const query = this.buildQuery(filters);
    const skip = (page - 1) * limit;

    const [chapters, totalChapters] = await Promise.all([
      Chapter.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Chapter.countDocuments(query)
    ]);

    // 4. Build response
    const result = {
      success: true,
      data: {
        chapters,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalChapters / limit),
          totalChapters,
          hasNextPage: page < Math.ceil(totalChapters / limit),
          hasPrevPage: page > 1,
          limit
        }
      }
    };

    // 5. Store in cache (without cache metadata)
    const resultToCache = { ...result };
    await cacheService.set(cacheKey, resultToCache);

    // 6. Return with cache metadata
    return {
      ...result,
      cache: { hit: false, key: cacheKey, timestamp: new Date().toISOString() }
    };
  } catch (error) {
    throw error;
  }
}
```

**Cache Strategy Benefits:**

- **Performance**: 50-100ms vs 200-500ms response times
- **Scalability**: Reduces database load by 80%+
- **Reliability**: Graceful fallback if Redis fails
- **Flexibility**: TTL and pattern-based invalidation

---

## 4. **"How do you handle database connections?"**

### **Connection Management:**

```javascript
// config/database.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool configuration
      maxPoolSize: 10, // Maximum number of connections
      serverSelectionTimeoutMS: 5000, // How long to try selecting a server
      socketTimeoutMS: 45000, // How long a socket stays open
      family: 4, // Use IPv4, skip trying IPv6

      // Performance optimizations
      bufferCommands: false, // Disable mongoose buffering
      bufferMaxEntries: 0, // Disable mongoose buffering

      // Resilience
      retryWrites: true, // Retry failed writes
      w: "majority", // Write concern
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

**Connection Pool Benefits:**

- **Performance**: Reuse connections instead of creating new ones
- **Resource Management**: Limit concurrent connections
- **Reliability**: Automatic reconnection and error handling
- **Scalability**: Efficient resource utilization

---

## 5. **"Show me your validation implementation"**

### **Input Validation Middleware:**

```javascript
// middleware/validation.js
const { body, param, query, validationResult } = require("express-validator");
const ErrorResponse = require("../utils/ErrorResponse");

// Validation rules for creating/updating chapters
const validateChapter = [
  body("subject")
    .trim()
    .notEmpty()
    .withMessage("Subject is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Subject must be between 2-50 characters"),

  body("chapter")
    .trim()
    .notEmpty()
    .withMessage("Chapter name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Chapter name must be between 2-100 characters"),

  body("class")
    .trim()
    .notEmpty()
    .withMessage("Class is required")
    .matches(/^Class (9|10|11|12)$/)
    .withMessage('Class must be in format "Class 9/10/11/12"'),

  body("unit").trim().notEmpty().withMessage("Unit is required"),

  body("questionSolved")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Questions solved must be a non-negative integer"),

  body("status")
    .optional()
    .isIn(["Not Started", "In Progress", "Completed"])
    .withMessage("Status must be one of: Not Started, In Progress, Completed"),

  body("isWeakChapter")
    .optional()
    .isBoolean()
    .withMessage("isWeakChapter must be a boolean"),

  body("yearWiseQuestionCount")
    .optional()
    .custom((value) => {
      if (typeof value !== "object") {
        throw new Error("yearWiseQuestionCount must be an object");
      }

      for (const [year, count] of Object.entries(value)) {
        if (!/^\d{4}$/.test(year) || !Number.isInteger(count) || count < 0) {
          throw new Error(
            "yearWiseQuestionCount must have valid year keys and non-negative integer values"
          );
        }
      }
      return true;
    }),
];

// Validation for MongoDB ObjectId parameters
const validateObjectId = [
  param("id").isMongoId().withMessage("Invalid chapter ID format"),
];

// Query parameter validation
const validateQueryParams = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),

  query("subject")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Subject cannot be empty"),

  query("status")
    .optional()
    .isIn(["Not Started", "In Progress", "Completed"])
    .withMessage("Invalid status value"),
];

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return next(
      new ErrorResponse(
        `Validation Error: ${errorMessages.map((e) => e.message).join(", ")}`,
        400
      )
    );
  }

  next();
};

module.exports = {
  validateChapter,
  validateObjectId,
  validateQueryParams,
  handleValidationErrors,
};
```

### **Usage in Routes:**

```javascript
// routes/chapters.js
router.post(
  "/",
  validateChapter, // Apply validation rules
  handleValidationErrors, // Check for validation errors
  chapterController.createChapter // Execute controller if valid
);

router.get(
  "/:id",
  validateObjectId,
  handleValidationErrors,
  chapterController.getChapterById
);
```

**Validation Benefits:**

- **Security**: Prevents malicious input injection
- **Data Integrity**: Ensures consistent data format
- **User Experience**: Clear error messages
- **API Robustness**: Catches errors early in the pipeline

---

## 6. **"Explain your rate limiting implementation"**

### **Redis-Backed Rate Limiter:**

```javascript
// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const { getRedisClient } = require("../config/redis");

const createRateLimiter = () => {
  const redisClient = getRedisClient();

  const limiterConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: "15 minutes",
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit-* headers

    // Custom key generator (could include user ID if authenticated)
    keyGenerator: (req) => {
      return req.ip + ":" + (req.user?.id || "anonymous");
    },

    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
        limit: req.rateLimit.limit,
        remaining: req.rateLimit.remaining,
      });
    },
  };

  // Use Redis store if available, fallback to memory store
  if (redisClient) {
    limiterConfig.store = new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: "rl:", // Rate limit prefix in Redis
    });
    console.log("Rate limiter using Redis store");
  } else {
    console.warn(
      "Rate limiter using memory store (not recommended for production)"
    );
  }

  return rateLimit(limiterConfig);
};

// Different rate limits for different endpoint types
const createStrictRateLimiter = () => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Stricter limit for write operations
    message: { error: "Too many write requests, please slow down." },
  });
};

module.exports = { createRateLimiter, createStrictRateLimiter };
```

**Rate Limiting Strategy:**

- **Distributed**: Redis-backed for multiple server instances
- **Flexible**: Different limits for different operations
- **Informative**: Clear error messages and retry information
- **Graceful**: Memory fallback if Redis unavailable

---

## 7. **"How do you handle environment configuration?"**

### **Environment Configuration:**

```javascript
// config/index.js
const config = {
  // Database
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/chapters",

  // Redis
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

  // Application
  port: parseInt(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // Security
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-in-production",
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPassword: process.env.ADMIN_PASSWORD || "change-me",

  // Cache
  cacheTTL: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour

  // Rate limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,

  // Validation
  isProduction: () => config.nodeEnv === "production",
  isDevelopment: () => config.nodeEnv === "development",

  // Required environment variables validation
  validateRequired: () => {
    const required = ["MONGODB_URI"];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  },
};

// Validate on startup
if (config.isProduction()) {
  config.validateRequired();
}

module.exports = config;
```

### **Environment Files:**

```bash
# .env.development
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chapters-dev
REDIS_URL=redis://localhost:6379
PORT=3000
CACHE_TTL=300

# .env.production
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/chapters
REDIS_URL=redis://user:pass@redis-host:port
PORT=3000
CACHE_TTL=3600
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-password
```

**Configuration Benefits:**

- **Security**: Sensitive data in environment variables
- **Flexibility**: Different configs for different environments
- **Validation**: Required variables checked on startup
- **Defaults**: Sensible fallbacks for development

---

## 8. **"Show me how you implement pagination"**

### **Pagination Implementation:**

```javascript
// services/chapterService.js - Pagination logic
async getAllChapters(filters = {}, page = 1, limit = 10) {
  // Input validation and sanitization
  page = Math.max(1, parseInt(page)); // Ensure minimum page is 1
  limit = Math.min(100, Math.max(1, parseInt(limit))); // Limit between 1-100

  const skip = (page - 1) * limit;

  // Build MongoDB query
  const query = this.buildQuery(filters);

  // Execute count and data queries in parallel
  const [chapters, totalChapters] = await Promise.all([
    Chapter.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(), // Use lean() for better performance
    Chapter.countDocuments(query)
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalChapters / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    success: true,
    data: {
      chapters,
      pagination: {
        currentPage: page,
        totalPages,
        totalChapters,
        hasNextPage,
        hasPrevPage,
        limit,
        startIndex: skip + 1,
        endIndex: Math.min(skip + limit, totalChapters)
      }
    }
  };
}
```

### **Pagination Helper Functions:**

```javascript
// utils/pagination.js
class PaginationHelper {
  static calculateOffset(page, limit) {
    return (Math.max(1, parseInt(page)) - 1) * Math.max(1, parseInt(limit));
  }

  static generatePageLinks(baseUrl, currentPage, totalPages, limit) {
    const links = {};

    if (currentPage > 1) {
      links.prev = `${baseUrl}?page=${currentPage - 1}&limit=${limit}`;
      links.first = `${baseUrl}?page=1&limit=${limit}`;
    }

    if (currentPage < totalPages) {
      links.next = `${baseUrl}?page=${currentPage + 1}&limit=${limit}`;
      links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`;
    }

    return links;
  }

  static validatePaginationParams(page, limit) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    return { page: validatedPage, limit: validatedLimit };
  }
}

module.exports = PaginationHelper;
```

**Pagination Benefits:**

- **Performance**: Only fetch required data
- **User Experience**: Easy navigation through large datasets
- **Resource Management**: Prevent memory issues with large collections
- **SEO Friendly**: Proper pagination metadata for indexing

---

## 🎤 **Advanced Technical Questions**

### **Q: "How would you optimize database queries?"**

**A: Multi-level optimization strategy:**

```javascript
// 1. Index optimization
db.chapters.createIndex({ subject: 1, class: 1, status: 1 });
db.chapters.createIndex({ createdAt: -1 }); // For sorting

// 2. Query optimization with aggregation
const getChapterStats = async (filters) => {
  return await Chapter.aggregate([
    { $match: filters },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgQuestionsSolved: { $avg: "$questionSolved" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// 3. Projection to reduce data transfer
const getChapterTitles = async () => {
  return await Chapter.find({}, "subject chapter class").lean();
};
```

### **Q: "How do you handle concurrent requests?"**

**A: Multiple strategies:**

```javascript
// 1. Optimistic locking with version keys
const updateChapterSafely = async (id, updates) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const chapter = await Chapter.findById(id).session(session);
      if (!chapter) throw new Error("Chapter not found");

      // Check version for optimistic locking
      if (updates.__v !== undefined && updates.__v !== chapter.__v) {
        throw new Error("Document was modified by another process");
      }

      await Chapter.findByIdAndUpdate(id, updates, { session });
    });
  } finally {
    await session.endSession();
  }
};

// 2. Cache locking for critical sections
const updateWithCacheLock = async (id, updates) => {
  const lockKey = `lock:chapter:${id}`;
  const lockTTL = 30; // 30 seconds

  const acquired = await redisClient.set(
    lockKey,
    "locked",
    "EX",
    lockTTL,
    "NX"
  );
  if (!acquired) {
    throw new Error("Resource is being modified by another process");
  }

  try {
    // Perform update
    const result = await Chapter.findByIdAndUpdate(id, updates);

    // Invalidate cache
    await cacheService.invalidatePattern(`chapter:${id}*`);

    return result;
  } finally {
    await redisClient.del(lockKey);
  }
};
```

---

## 💡 **Performance Monitoring Code**

### **Request Timing Middleware:**

```javascript
// middleware/performance.js
const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds

    // Log slow requests
    if (duration > 1000) {
      // > 1 second
      console.warn(
        `Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(
          2
        )}ms`
      );
    }

    // Add timing header
    res.set("X-Response-Time", `${duration.toFixed(2)}ms`);
  });

  next();
};
```

### **Memory Monitoring:**

```javascript
// utils/monitoring.js
const monitorMemory = () => {
  const usage = process.memoryUsage();

  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024),
  };
};

// Health check with metrics
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: monitorMemory(),
    environment: process.env.NODE_ENV,
  });
});
```

---

**These code examples demonstrate deep technical knowledge and production-ready practices that will impress interviewers! 🚀**
