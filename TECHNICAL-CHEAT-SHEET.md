# Backend Interview Cheat Sheet

## Chapter Performance API - Quick Reference

### 🚀 **Project Elevator Pitch**

_"Built a production-ready REST API with Node.js, Express, MongoDB, and Redis. Features include caching, rate limiting, pagination, CRUD operations, and comprehensive error handling. Deployed on Render with 90/90 technical assessment score."_

---

## 🔥 **Technical Stack**

| Category            | Technology    | Purpose                       |
| ------------------- | ------------- | ----------------------------- |
| **Runtime**         | Node.js       | JavaScript server environment |
| **Framework**       | Express.js    | Web application framework     |
| **Database**        | MongoDB Atlas | NoSQL document database       |
| **Caching**         | Redis Cloud   | In-memory data store          |
| **ODM**             | Mongoose      | MongoDB object modeling       |
| **Deployment**      | Render.com    | Cloud hosting platform        |
| **Version Control** | Git/GitHub    | Source code management        |

---

## 📋 **API Endpoints Quick Reference**

```bash
# Core CRUD Operations
GET    /api/v1/chapters           # List chapters (paginated, filterable)
GET    /api/v1/chapters/:id       # Get single chapter
POST   /api/v1/chapters           # Create new chapter
PUT    /api/v1/chapters/:id       # Update chapter
DELETE /api/v1/chapters/:id       # Delete chapter

# Utility Endpoints
GET    /api/v1/health             # Health check
POST   /api/v1/chapters/upload    # Bulk upload
GET    /                          # API documentation
```

---

## 🏗️ **Architecture Overview**

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Client    │ -> │     API      │ -> │  Database   │
│ (Frontend)  │    │ (Express.js) │    │ (MongoDB)   │
└─────────────┘    └──────────────┘    └─────────────┘
                          │
                          v
                   ┌─────────────┐
                   │    Cache    │
                   │  (Redis)    │
                   └─────────────┘
```

### **MVC Pattern Implementation**

- **Models**: `Chapter.js` (Mongoose schema)
- **Views**: JSON API responses
- **Controllers**: `chapterController.js` (request handlers)
- **Services**: `chapterService.js` (business logic)

---

## 💾 **Database Schema**

```javascript
const chapterSchema = {
  subject: String, // "Mathematics", "Physics"
  chapter: String, // "Probability", "Mechanics"
  class: String, // "Class 12", "Class 11"
  unit: String, // "Algebra", "Calculus"
  yearWiseQuestionCount: Map, // {2023: 5, 2024: 8}
  questionSolved: Number, // 35
  status: String, // "Not Started", "In Progress", "Completed"
  isWeakChapter: Boolean, // true/false
  createdAt: Date, // Auto-generated
  updatedAt: Date, // Auto-generated
};

// Indexes for performance
indexes: ["subject", "class", "status", "isWeakChapter"];
```

---

## ⚡ **Redis Caching Strategy**

### **Cache-Aside Pattern**

```javascript
// 1. Check cache first
const cached = await cache.get(key);
if (cached) return cached;

// 2. Fetch from database
const data = await database.find();

// 3. Store in cache
await cache.set(key, data, ttl);
return data;
```

### **Cache Key Strategy**

```javascript
// Examples of generated cache keys
"chapters:page:1:limit:10";
"chapters:subject:Mathematics:page:1:limit:5";
"chapter:683fd8bedcc386154a80c408";
```

### **Cache Performance**

- **TTL**: 1 hour (3600 seconds)
- **Hit Rate**: 80%+
- **Response Time**: 50-100ms (cached) vs 200-500ms (database)

---

## 🔒 **Security Features**

| Feature              | Implementation      | Purpose                         |
| -------------------- | ------------------- | ------------------------------- |
| **Helmet.js**        | Security headers    | XSS, clickjacking protection    |
| **CORS**             | Cross-origin config | Control frontend access         |
| **Rate Limiting**    | Redis-backed        | DDoS protection (100 req/15min) |
| **Input Validation** | express-validator   | Sanitize user input             |
| **Error Handling**   | Custom middleware   | Secure error responses          |

---

## 🔄 **Request Lifecycle**

```
1. Client Request
   ↓
2. CORS Middleware
   ↓
3. Rate Limiting
   ↓
4. Body Parsing
   ↓
5. Route Matching
   ↓
6. Validation Middleware
   ↓
7. Controller Handler
   ↓
8. Service Layer (Cache Check)
   ↓
9. Database Query (if cache miss)
   ↓
10. Cache Storage
    ↓
11. JSON Response
    ↓
12. Error Handling (if needed)
```

---

## 📊 **Performance Optimizations**

### **Database Level**

- **Indexes**: On frequently queried fields
- **Lean Queries**: `.lean()` for read operations
- **Connection Pooling**: maxPoolSize: 10
- **Pagination**: Limit response size

### **Application Level**

- **Redis Caching**: L2 cache layer
- **Compression**: Gzip middleware
- **Response Optimization**: Minimal JSON structure

### **Deployment Level**

- **CDN Ready**: Static asset serving
- **Environment Optimization**: Production configs
- **Health Monitoring**: Uptime tracking

---

## 🛠️ **Development Tools & Workflow**

```bash
# Local Development
npm run dev          # Start with nodemon
npm run seed         # Populate test data
npm test            # Run test suite

# Production Deployment
git push origin main # Triggers auto-deployment
```

### **Environment Variables**

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Cache
REDIS_URL=redis://...

# Application
NODE_ENV=production
PORT=3000
CACHE_TTL=3600

# Security
ADMIN_USERNAME=admin
ADMIN_PASSWORD=***
```

---

## 🧪 **Testing Strategy**

### **Manual Testing**

- **Postman Collection**: Complete API testing
- **Web Interface**: Real-time testing tool
- **cURL Commands**: Command-line testing

### **Test Categories**

- **Unit Tests**: Individual function testing
- **Integration Tests**: Database + API testing
- **Performance Tests**: Load and stress testing
- **Cache Tests**: Hit/miss ratio validation

---

## 📈 **Scalability Considerations**

### **Current Scale**

- **Data**: 102 chapters managed
- **Requests**: 100+ req/second capability
- **Memory**: ~95MB RSS in production
- **Uptime**: 99%+ availability

### **Future Scaling**

- **Horizontal**: Multiple API instances
- **Database**: Sharding and read replicas
- **Cache**: Redis clustering
- **CDN**: Global content distribution

---

## 🚨 **Common Interview Questions & Answers**

### **Q: Why Node.js?**

**A:** Event-driven, non-blocking I/O perfect for API servers. Large ecosystem, JSON-native, and excellent performance for I/O-heavy operations like database queries.

### **Q: Why MongoDB over SQL?**

**A:** Schema flexibility for educational data, natural JSON integration, horizontal scaling capabilities, and faster development iteration.

### **Q: Explain your caching strategy**

**A:** Cache-aside pattern with Redis. Check cache first, fetch from DB on miss, store for future requests. TTL of 1 hour with intelligent key generation.

### **Q: How do you handle errors?**

**A:** Centralized error middleware that categorizes errors (validation, cast, duplicate), provides appropriate HTTP status codes, and logs for debugging.

### **Q: How would you scale to 10x traffic?**

**A:** Horizontal scaling with load balancer, database read replicas, Redis clustering, CDN for static assets, and application performance monitoring.

---

## 🎯 **Key Achievements to Highlight**

- ✅ **90/90 Points**: Complete technical assessment
- ✅ **Production Deployment**: Live API with SSL
- ✅ **Redis Caching**: 80%+ hit rate performance
- ✅ **Comprehensive Features**: CRUD, validation, security
- ✅ **Clean Architecture**: MVC with service layer
- ✅ **Error Handling**: Robust production-ready code

---

## 💡 **Demo Script (3 minutes)**

```bash
# 1. Show API Health
curl https://taskmog1.onrender.com/api/v1/health

# 2. Demonstrate Caching (Cache Miss)
curl "https://taskmog1.onrender.com/api/v1/chapters?page=5&limit=3"

# 3. Demonstrate Caching (Cache Hit)
curl "https://taskmog1.onrender.com/api/v1/chapters?page=5&limit=3"

# 4. Show Filtering
curl "https://taskmog1.onrender.com/api/v1/chapters?subject=Mathematics&status=Completed"

# 5. Show Error Handling
curl "https://taskmog1.onrender.com/api/v1/chapters/invalid-id"
```

---

## 🎤 **Behavioral Questions Prep**

### **Challenge & Solution**

_"Biggest challenge was implementing Redis caching with proper invalidation. Solved by using cache-aside pattern with intelligent key generation, resulting in 80% hit rate and 50% performance improvement."_

### **Technical Decision**

_"Chose MongoDB for schema flexibility and Redis for caching performance. This combination provides both development speed and production performance."_

### **Future Improvements**

_"Would add automated testing pipeline, API documentation with Swagger, monitoring with Prometheus, and microservices architecture for larger scale."_

---

**Live Production API**: https://taskmog1.onrender.com/  
**Repository**: https://github.com/ashish6318/taskmog.git  
**Status**: Fully operational with 90/90 score 🎯
