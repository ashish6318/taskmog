# System Design Interview Guide

## Chapter Performance API - Scalability & Architecture Deep Dive

### 🎯 **System Design Overview**

**Current System Architecture:**

```
Client Applications
       ↓
Load Balancer (Future)
       ↓
API Gateway/Reverse Proxy (Future)
       ↓
Node.js API Server (Current: Single Instance)
       ↓
┌─────────────┬─────────────┐
│   MongoDB   │    Redis    │
│   (Atlas)   │   (Cloud)   │
└─────────────┴─────────────┘
```

---

## 📈 **Scaling Interview Questions**

### **Q1: "How would you scale this API to handle 1 million users?"**

**Answer Strategy:**

**1. Horizontal Scaling (Application Tier)**

```javascript
// Current: Single Node.js instance
// Scaled: Multiple instances behind load balancer

// Stateless Design (Already Implemented)
class ChapterService {
  async getAllChapters(filters, page, limit) {
    // No instance state - pure functions
    // Session data in JWT tokens
    // Cache in external Redis
  }
}

// Load Balancer Configuration
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Worker process
  app.listen(PORT);
}
```

**2. Database Scaling Strategy**

```javascript
// Read Replicas for Query Distribution
const mongoose = require("mongoose");

// Write to Primary
const writeDB = mongoose.createConnection(MONGODB_WRITE_URI);

// Read from Replicas
const readDB = mongoose.createConnection(MONGODB_READ_URI);

class ChapterService {
  async getAllChapters() {
    // Use read replica for queries
    return readDB.model("Chapter").find();
  }

  async createChapter(data) {
    // Use primary for writes
    return writeDB.model("Chapter").create(data);
  }
}

// Sharding Strategy (for massive scale)
// Shard by: class + subject
// Class 10 Math → Shard 1
// Class 11 Physics → Shard 2
// Class 12 Chemistry → Shard 3
```

**3. Caching Strategy Enhancement**

```javascript
// Multi-layer Caching Architecture

// Layer 1: Application Cache (Node.js)
const NodeCache = require("node-cache");
const appCache = new NodeCache({ stdTTL: 600 }); // 10 minutes

// Layer 2: Redis (Current Implementation)
const redisCache = require("./config/redis");

// Layer 3: CDN Cache (for static responses)
app.use("/api/v1/chapters", (req, res, next) => {
  res.set({
    "Cache-Control": "public, max-age=300", // 5 minutes CDN cache
    ETag: generateETag(req.query),
  });
  next();
});

// Hierarchical Cache Strategy
async function getCachedData(key) {
  // 1. Check app cache (fastest)
  let data = appCache.get(key);
  if (data) return { data, source: "app-cache" };

  // 2. Check Redis (fast)
  data = await redisCache.get(key);
  if (data) {
    appCache.set(key, data); // Promote to app cache
    return { data, source: "redis" };
  }

  // 3. Check database (slowest)
  data = await database.find();
  await redisCache.set(key, data);
  appCache.set(key, data);
  return { data, source: "database" };
}
```

### **Q2: "How would you handle database failures?"**

**Answer Strategy:**

**1. High Availability Setup**

```javascript
// MongoDB Replica Set Configuration
const mongoose = require("mongoose");

const options = {
  // Replica Set Options
  replicaSet: "rs0",
  readPreference: "secondaryPreferred",
  maxPoolSize: 50,

  // Failover Configuration
  serverSelectionTimeoutMS: 5000,
  heartbeatFrequencyMS: 2000,

  // Retry Logic
  retryWrites: true,
  retryReads: true,
};

// Circuit Breaker Pattern
class DatabaseCircuitBreaker {
  constructor() {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.threshold = 5;
    this.timeout = 60000; // 1 minute
  }

  async execute(operation) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
    }
  }
}
```

**2. Data Backup & Recovery**

```javascript
// Automated Backup Strategy
const cron = require("node-cron");

// Daily backups at 2 AM
cron.schedule("0 2 * * *", async () => {
  try {
    await createDatabaseBackup();
    await uploadToCloudStorage();
    await cleanupOldBackups();
  } catch (error) {
    await notifyAdmins("Backup failed", error);
  }
});

// Point-in-time Recovery
class BackupService {
  async createBackup() {
    const timestamp = new Date().toISOString();
    const backupPath = `backups/chapters-${timestamp}.json`;

    const data = await Chapter.find().lean();
    await uploadToS3(backupPath, JSON.stringify(data));

    return { backupPath, timestamp, recordCount: data.length };
  }

  async restoreFromBackup(backupPath) {
    const data = await downloadFromS3(backupPath);
    const chapters = JSON.parse(data);

    // Bulk insert with upsert
    await Chapter.bulkWrite(
      chapters.map((chapter) => ({
        updateOne: {
          filter: { _id: chapter._id },
          update: chapter,
          upsert: true,
        },
      }))
    );
  }
}
```

### **Q3: "How would you implement real-time features?"**

**Answer Strategy:**

**1. WebSocket Implementation**

```javascript
// Socket.IO Integration
const socketIo = require("socket.io");

class RealTimeService {
  constructor(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
      },
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Join chapter-specific rooms
      socket.on("join-chapter", (chapterId) => {
        socket.join(`chapter-${chapterId}`);
      });

      // Handle real-time progress updates
      socket.on("progress-update", async (data) => {
        await this.updateChapterProgress(data);

        // Broadcast to all clients watching this chapter
        this.io.to(`chapter-${data.chapterId}`).emit("progress-changed", data);
      });
    });
  }

  async notifyProgressUpdate(chapterId, progressData) {
    // Emit to specific chapter room
    this.io.to(`chapter-${chapterId}`).emit("progress-updated", progressData);

    // Also emit global leaderboard updates
    this.io.emit("leaderboard-changed", await this.getLeaderboard());
  }
}

// Integration with existing API
app.post("/api/v1/chapters/:id/progress", async (req, res) => {
  const chapter = await chapterService.updateProgress(req.params.id, req.body);

  // Emit real-time update
  realTimeService.notifyProgressUpdate(req.params.id, chapter);

  res.json({ success: true, data: chapter });
});
```

**2. Server-Sent Events (Alternative)**

```javascript
// SSE for simpler real-time updates
app.get("/api/v1/chapters/:id/progress-stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  const chapterId = req.params.id;

  // Send initial data
  res.write(`data: ${JSON.stringify({ type: "connected", chapterId })}\n\n`);

  // Set up MongoDB change stream
  const changeStream = Chapter.watch([
    { $match: { "fullDocument._id": mongoose.Types.ObjectId(chapterId) } },
  ]);

  changeStream.on("change", (change) => {
    res.write(
      `data: ${JSON.stringify({
        type: "progress-update",
        data: change.fullDocument,
      })}\n\n`
    );
  });

  req.on("close", () => {
    changeStream.close();
  });
});
```

### **Q4: "How would you implement microservices architecture?"**

**Answer Strategy:**

**1. Service Decomposition**

```javascript
// Current Monolith → Microservices Breakdown

// 1. Chapter Service (Current API)
// 2. User Progress Service
// 3. Analytics Service
// 4. Notification Service
// 5. File Upload Service

// API Gateway Pattern
const express = require("express");
const httpProxy = require("http-proxy-middleware");

const apiGateway = express();

// Route to different services
apiGateway.use(
  "/api/v1/chapters",
  httpProxy({
    target: "http://chapter-service:3001",
    changeOrigin: true,
  })
);

apiGateway.use(
  "/api/v1/progress",
  httpProxy({
    target: "http://progress-service:3002",
    changeOrigin: true,
  })
);

apiGateway.use(
  "/api/v1/analytics",
  httpProxy({
    target: "http://analytics-service:3003",
    changeOrigin: true,
  })
);

// Service Discovery
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  register(serviceName, serviceUrl, healthCheck) {
    this.services.set(serviceName, {
      url: serviceUrl,
      healthCheck,
      lastSeen: Date.now(),
    });
  }

  async getHealthyService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) throw new Error(`Service ${serviceName} not found`);

    const isHealthy = await this.checkHealth(service);
    if (!isHealthy) throw new Error(`Service ${serviceName} is unhealthy`);

    return service.url;
  }
}
```

**2. Inter-Service Communication**

```javascript
// Event-Driven Architecture
const EventEmitter = require("events");

class ServiceBus extends EventEmitter {
  async publishEvent(eventType, data) {
    // Publish to message queue (Redis Pub/Sub, RabbitMQ, etc.)
    await this.redisClient.publish(
      eventType,
      JSON.stringify({
        timestamp: new Date(),
        data,
        serviceId: process.env.SERVICE_ID,
      })
    );

    // Also emit locally
    this.emit(eventType, data);
  }

  subscribeToEvent(eventType, handler) {
    this.redisClient.subscribe(eventType);
    this.redisClient.on("message", (channel, message) => {
      if (channel === eventType) {
        const event = JSON.parse(message);
        handler(event.data);
      }
    });
  }
}

// Usage in Chapter Service
class ChapterService {
  async updateChapter(id, data) {
    const chapter = await Chapter.findByIdAndUpdate(id, data, { new: true });

    // Publish event for other services
    serviceBus.publishEvent("chapter.updated", {
      chapterId: id,
      changes: data,
      chapter,
    });

    return chapter;
  }
}

// Progress Service listens for chapter updates
serviceBus.subscribeToEvent("chapter.updated", async (data) => {
  if (data.changes.status === "Completed") {
    await progressService.recordCompletion(data.chapterId);
  }
});
```

### **Q5: "How would you handle security at scale?"**

**Answer Strategy:**

**1. Authentication & Authorization**

```javascript
// JWT + Redis Session Management
const jwt = require("jsonwebtoken");
const Redis = require("redis");

class AuthService {
  async login(credentials) {
    const user = await User.findOne({ email: credentials.email });

    if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
      throw new Error("Invalid credentials");
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Store session in Redis for quick revocation
    const sessionKey = `session:${user._id}:${Date.now()}`;
    await redisClient.setEx(
      sessionKey,
      900,
      JSON.stringify({
        userId: user._id,
        loginTime: new Date(),
        userAgent: req.headers["user-agent"],
      })
    );

    return { token, sessionKey };
  }

  async validateToken(token, sessionKey) {
    // 1. Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2. Check session still exists
    const session = await redisClient.get(sessionKey);
    if (!session) throw new Error("Session expired");

    // 3. Check user still active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) throw new Error("User inactive");

    return decoded;
  }
}

// Role-Based Access Control
const authorize = (requiredRole) => async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const sessionKey = req.headers["x-session-key"];

    const decoded = await authService.validateToken(token, sessionKey);

    if (decoded.role !== requiredRole && decoded.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Usage
app.get("/api/v1/chapters", rateLimiter, getAllChapters);
app.post("/api/v1/chapters", authorize("teacher"), createChapter);
app.delete("/api/v1/chapters/:id", authorize("admin"), deleteChapter);
```

**2. Advanced Rate Limiting**

```javascript
// Adaptive Rate Limiting
class AdaptiveRateLimiter {
  constructor() {
    this.baseLimits = {
      anonymous: { requests: 100, window: 3600 },
      user: { requests: 1000, window: 3600 },
      premium: { requests: 5000, window: 3600 },
    };
  }

  async checkLimit(key, userType = "anonymous") {
    const limit = this.baseLimits[userType];
    const current = await redisClient.incr(`rate_limit:${key}`);

    if (current === 1) {
      await redisClient.expire(`rate_limit:${key}`, limit.window);
    }

    // Adaptive adjustment based on system load
    const systemLoad = await this.getSystemLoad();
    const adjustedLimit =
      systemLoad > 0.8 ? limit.requests * 0.5 : limit.requests;

    if (current > adjustedLimit) {
      throw new Error("Rate limit exceeded");
    }

    return {
      allowed: true,
      remaining: adjustedLimit - current,
      resetTime: await redisClient.ttl(`rate_limit:${key}`),
    };
  }

  async getSystemLoad() {
    // Check CPU, memory, database connections
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    return Math.max(
      cpuUsage.user / 1000000 / 100, // CPU percentage
      memUsage.heapUsed / memUsage.heapTotal // Memory percentage
    );
  }
}
```

---

## 🔧 **Performance Interview Questions**

### **Q6: "How would you optimize database queries for millions of records?"**

**Answer Strategy:**

**1. Advanced Indexing**

```javascript
// Compound Indexes for Complex Queries
db.chapters.createIndex(
  {
    subject: 1,
    class: 1,
    status: 1,
  },
  {
    name: "subject_class_status_idx",
  }
);

// Partial Indexes for Specific Conditions
db.chapters.createIndex(
  { isWeakChapter: 1, subject: 1 },
  {
    partialFilterExpression: { isWeakChapter: true },
    name: "weak_chapters_idx",
  }
);

// Text Indexes for Search
db.chapters.createIndex(
  {
    chapter: "text",
    unit: "text",
  },
  {
    weights: { chapter: 10, unit: 5 },
    name: "search_idx",
  }
);
```

**2. Query Optimization**

```javascript
// Aggregation Pipeline Optimization
class ChapterService {
  async getChapterStatistics() {
    return Chapter.aggregate([
      // Stage 1: Match filters early
      { $match: { status: { $ne: "Not Started" } } },

      // Stage 2: Group and calculate
      {
        $group: {
          _id: {
            subject: "$subject",
            class: "$class",
          },
          totalChapters: { $sum: 1 },
          completedChapters: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          avgQuestionsSolved: { $avg: "$questionSolved" },
        },
      },

      // Stage 3: Sort results
      { $sort: { "_id.subject": 1, "_id.class": 1 } },

      // Stage 4: Limit results for pagination
      { $limit: 50 },
    ]).allowDiskUse(true); // For large datasets
  }

  // Efficient Pagination with Cursor
  async getChaptersPaginated(lastId = null, limit = 20) {
    const query = lastId ? { _id: { $gt: lastId } } : {};

    return Chapter.find(query).sort({ _id: 1 }).limit(limit).lean(); // Returns plain JS objects, not Mongoose documents
  }
}
```

### **Q7: "How would you implement distributed caching?"**

**Answer Strategy:**

**1. Redis Cluster Setup**

```javascript
// Redis Cluster Configuration
const Redis = require("ioredis");

const cluster = new Redis.Cluster(
  [
    { host: "redis-node-1", port: 6379 },
    { host: "redis-node-2", port: 6379 },
    { host: "redis-node-3", port: 6379 },
  ],
  {
    enableOfflineQueue: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  }
);

class DistributedCacheService {
  constructor() {
    this.cluster = cluster;
    this.localCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      errors: 0,
    };
  }

  async get(key) {
    try {
      // L1: Local cache (fastest)
      if (this.localCache.has(key)) {
        this.cacheStats.hits++;
        return this.localCache.get(key);
      }

      // L2: Redis cluster
      const value = await this.cluster.get(key);
      if (value) {
        const parsed = JSON.parse(value);
        this.localCache.set(key, parsed);
        this.cacheStats.hits++;
        return parsed;
      }

      this.cacheStats.misses++;
      return null;
    } catch (error) {
      this.cacheStats.errors++;
      console.error("Cache error:", error);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    try {
      const serialized = JSON.stringify(value);

      // Set in Redis cluster
      await this.cluster.setex(key, ttl, serialized);

      // Set in local cache with shorter TTL
      this.localCache.set(key, value);
      setTimeout(() => {
        this.localCache.delete(key);
      }, Math.min(ttl * 1000, 300000)); // Max 5 minutes local cache
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  // Cache invalidation across cluster
  async invalidatePattern(pattern) {
    const nodes = this.cluster.nodes("master");

    await Promise.all(
      nodes.map(async (node) => {
        const keys = await node.keys(pattern);
        if (keys.length > 0) {
          await node.del(...keys);
        }
      })
    );

    // Clear local cache
    this.localCache.clear();
  }
}
```

**2. Cache Warming Strategy**

```javascript
// Intelligent Cache Warming
class CacheWarmingService {
  constructor(cacheService, chapterService) {
    this.cache = cacheService;
    this.chapterService = chapterService;
    this.warmingQueue = [];
  }

  async warmPopularData() {
    // Warm most accessed data
    const popularQueries = [
      { subject: "Mathematics", class: "Class 12" },
      { subject: "Physics", class: "Class 11" },
      { status: "Completed" },
    ];

    for (const query of popularQueries) {
      await this.warmQuery(query);
    }
  }

  async warmQuery(filters, pages = 5) {
    for (let page = 1; page <= pages; page++) {
      const cacheKey = this.generateCacheKey(filters, page, 10);

      // Check if already cached
      const cached = await this.cache.get(cacheKey);
      if (!cached) {
        // Warm the cache
        const data = await this.chapterService.getAllChapters(
          filters,
          page,
          10
        );
        await this.cache.set(cacheKey, data, 7200); // 2 hours for warmed data
      }
    }
  }

  // Schedule cache warming
  scheduleWarming() {
    const cron = require("node-cron");

    // Warm cache every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      console.log("Starting cache warming...");
      await this.warmPopularData();
      console.log("Cache warming completed");
    });
  }
}
```

---

## 📊 **Monitoring & Observability Questions**

### **Q8: "How would you implement comprehensive monitoring?"**

**Answer Strategy:**

**1. Application Performance Monitoring**

```javascript
// Custom Metrics Collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requestCount: 0,
      responseTimeSum: 0,
      errorCount: 0,
      cacheHitRate: 0,
      databaseQueryTime: 0,
    };

    this.histogram = {
      responseTime: [],
      databaseQueryTime: [],
    };
  }

  recordRequest(req, res, responseTime) {
    this.metrics.requestCount++;
    this.metrics.responseTimeSum += responseTime;
    this.histogram.responseTime.push(responseTime);

    if (res.statusCode >= 400) {
      this.metrics.errorCount++;
    }

    // Keep histogram size manageable
    if (this.histogram.responseTime.length > 1000) {
      this.histogram.responseTime.shift();
    }
  }

  getPercentile(arr, percentile) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  getMetrics() {
    const avgResponseTime =
      this.metrics.responseTimeSum / this.metrics.requestCount;
    const errorRate =
      (this.metrics.errorCount / this.metrics.requestCount) * 100;

    return {
      requestCount: this.metrics.requestCount,
      avgResponseTime,
      errorRate,
      p95ResponseTime: this.getPercentile(this.histogram.responseTime, 95),
      p99ResponseTime: this.getPercentile(this.histogram.responseTime, 99),
      cacheHitRate: this.metrics.cacheHitRate,
    };
  }
}

// Middleware for metrics collection
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    metricsCollector.recordRequest(req, res, responseTime);
  });

  next();
};
```

**2. Health Check Endpoints**

```javascript
// Comprehensive Health Checks
class HealthCheckService {
  async checkDatabase() {
    try {
      await mongoose.connection.db.admin().ping();
      return { status: "healthy", responseTime: Date.now() };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkRedis() {
    try {
      const start = Date.now();
      await redisClient.ping();
      return {
        status: "healthy",
        responseTime: Date.now() - start,
        memory: await redisClient.memory("usage"),
      };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }

  async checkExternalServices() {
    // Check any external APIs or services
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    return {
      database: checks[0].value,
      redis: checks[1].value,
      overall: checks.every(
        (check) =>
          check.status === "fulfilled" && check.value.status === "healthy"
      )
        ? "healthy"
        : "degraded",
    };
  }
}

// Enhanced health endpoint
app.get("/api/v1/health", async (req, res) => {
  const healthCheck = new HealthCheckService();
  const checks = await healthCheck.checkExternalServices();
  const metrics = metricsCollector.getMetrics();

  res.status(checks.overall === "healthy" ? 200 : 503).json({
    status: checks.overall,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics,
    services: checks,
  });
});
```

---

## 🎯 **Quick Fire Technical Questions**

### **Database Questions:**

1. **"Explain ACID properties"** → Atomicity, Consistency, Isolation, Durability
2. **"MongoDB vs SQL for this use case?"** → Schema flexibility, JSON structure, horizontal scaling
3. **"How do you handle transactions in MongoDB?"** → Multi-document transactions, atomic operations

### **Caching Questions:**

1. **"Cache-aside vs Write-through?"** → Manual vs automatic cache management
2. **"How to prevent cache stampede?"** → Locking, exponential backoff, cache warming
3. **"Cache eviction policies?"** → LRU, LFU, TTL-based expiration

### **Performance Questions:**

1. **"How to identify slow queries?"** → MongoDB profiler, explain() method, monitoring
2. **"N+1 query problem solution?"** → Population, aggregation, batch loading
3. **"Memory leak detection?"** → Process monitoring, heap dumps, profiling tools

### **Security Questions:**

1. **"SQL injection prevention?"** → Parameterized queries, input validation, ORM usage
2. **"JWT vs Sessions?"** → Stateless vs stateful, scalability trade-offs
3. **"Rate limiting algorithms?"** → Token bucket, sliding window, fixed window

### **DevOps Questions:**

1. **"Blue-green deployment?"** → Zero-downtime deployment strategy
2. **"Container orchestration?"** → Docker, Kubernetes, service mesh
3. **"Log aggregation?"** → Centralized logging, structured logs, monitoring

---

This system design guide prepares you for senior-level backend engineering interviews where you need to demonstrate not just coding skills, but architectural thinking and scalability considerations. Practice explaining these concepts clearly and be ready to draw diagrams during interviews! 🚀
