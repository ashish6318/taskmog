# 🎯 API Scoring Tests (90/100 Marks)

## 📊 Test Coverage Breakdown

| Section               | Criteria                                     | Marks  | Test Status |
| --------------------- | -------------------------------------------- | ------ | ----------- |
| API Functionality     | Working endpoints with filtering & responses | 30     | ✅ Ready    |
| Caching (Redis)       | Proper cache setup, invalidation logic       | 15     | ✅ Ready    |
| Rate Limiting (Redis) | IP-based rate limiting                       | 10     | ✅ Ready    |
| Pagination            | Client query param logic                     | 10     | ✅ Ready    |
| Code Quality          | Clean, modular, error-handled code           | 15     | ✅ Ready    |
| Deployment            | Hosted API with working endpoints            | 10     | 🔄 Manual   |
| **TOTAL**             | **Without Bonus**                            | **90** |             |

---

## 🔧 1. API Functionality Testing (30 Marks)

### Required Tests:

#### A. Health Check Endpoint

```bash
GET http://localhost:3000/api/v1/health
```

**Expected Output:**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-06-04T...",
  "uptime": 123.45,
  "memory": {...},
  "database": "connected",
  "cache": "connected"
}
```

#### B. Get All Chapters (Basic)

```bash
GET http://localhost:3000/api/v1/chapters
```

**Expected Output:**

```json
{
  "success": true,
  "data": {
    "chapters": [...],
    "totalCount": 101,
    "page": 1,
    "limit": 20,
    "totalPages": 6,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "cached": false
}
```

#### C. Subject Filtering

```bash
GET http://localhost:3000/api/v1/chapters?subject=Physics
```

**Expected Output:** Only Physics chapters returned

#### D. Class Filtering

```bash
GET http://localhost:3000/api/v1/chapters?class=Class%2011
```

**Expected Output:** Only Class 11 chapters returned

#### E. Status Filtering

```bash
GET http://localhost:3000/api/v1/chapters?status=Completed
```

**Expected Output:** Only completed chapters returned

#### F. Combined Filtering

```bash
GET http://localhost:3000/api/v1/chapters?subject=Mathematics&class=Class%2012&status=In%20Progress
```

**Expected Output:** Filtered results matching all criteria

#### G. Get Single Chapter

```bash
GET http://localhost:3000/api/v1/chapters/{chapter_id}
```

**Expected Output:** Single chapter details

#### H. Create Chapter (Admin)

```bash
POST http://localhost:3000/api/v1/chapters/single
Headers: Authorization: Bearer chapter-admin-secret-key-2024
Body: {
  "subject": "Test Subject",
  "chapter": "Test Chapter Name",
  "class": "Class 12",
  "unit": "Test Unit"
}
```

**Expected Output:** Created chapter with 201 status

---

## 🚀 2. Caching (Redis) Testing (15 Marks)

### Test Cache Implementation:

#### A. First Request (Cache Miss)

```bash
GET http://localhost:3000/api/v1/chapters?limit=5
```

**Expected:** `"cached": false` in response

#### B. Second Request (Cache Hit)

```bash
GET http://localhost:3000/api/v1/chapters?limit=5
```

**Expected:** `"cached": true` in response

#### C. Cache Invalidation Test

1. Get chapters list (cached)
2. Create new chapter (should clear cache)
3. Get chapters list again (cache miss - fresh data)

**Commands:**

```bash
# Step 1: Cache the data
GET http://localhost:3000/api/v1/chapters?limit=5

# Step 2: Create chapter (invalidates cache)
POST http://localhost:3000/api/v1/chapters/single
Headers: Authorization: Bearer chapter-admin-secret-key-2024

# Step 3: Request again (should be cache miss)
GET http://localhost:3000/api/v1/chapters?limit=5
```

---

## ⚡ 3. Rate Limiting Testing (10 Marks)

### Test IP-Based Rate Limiting:

#### Current Settings:

- **Window:** 60 seconds (1 minute)
- **Limit:** 30 requests per IP per minute

#### Test Procedure:

1. Make 30 rapid requests to any endpoint
2. On the 31st request, expect:

**Expected Response (429 Too Many Requests):**

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": 60
}
```

#### Rate Limit Test Script:

```bash
# Run this PowerShell script to test rate limiting
for ($i=1; $i -le 35; $i++) {
    Write-Host "Request $i"
    curl http://localhost:3000/api/v1/health
    Start-Sleep -Milliseconds 100
}
```

---

## 📖 4. Pagination Testing (10 Marks)

### Test Client-Based Query Parameters:

#### A. Basic Pagination

```bash
GET http://localhost:3000/api/v1/chapters?page=1&limit=10
GET http://localhost:3000/api/v1/chapters?page=2&limit=10
```

#### B. Pagination with Filtering

```bash
GET http://localhost:3000/api/v1/chapters?subject=Physics&page=1&limit=5
```

#### C. Edge Cases

```bash
# Large page number
GET http://localhost:3000/api/v1/chapters?page=999&limit=10

# Invalid parameters
GET http://localhost:3000/api/v1/chapters?page=abc&limit=xyz
```

**Expected Pagination Response Structure:**

```json
{
  "success": true,
  "data": {
    "chapters": [...],
    "totalCount": 101,
    "page": 1,
    "limit": 10,
    "totalPages": 11,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🏗️ 5. Code Quality Assessment (15 Marks)

### Areas to Demonstrate:

#### A. Error Handling

- Try invalid endpoints: `GET http://localhost:3000/api/v1/invalid`
- Try invalid chapter ID: `GET http://localhost:3000/api/v1/chapters/invalid-id`

#### B. Input Validation

- Try creating chapter without required fields
- Try with invalid data types

#### C. Modular Architecture

- Controllers in separate files
- Services layer implemented
- Middleware for auth, validation, rate limiting
- Clean separation of concerns

#### D. Security Features

- Helmet.js security headers
- CORS configuration
- Input sanitization
- Admin authentication

---

## 🌐 6. Web Interface Testing

### Use the HTML Test Interface:

**URL:** http://localhost:3000/test/test-web-ui.html

#### Test All Features:

1. **Health Check** - Click "Test Health"
2. **Get Chapters** - Try different limits
3. **Filtering** - Test subject, class, status filters
4. **Pagination** - Test different page numbers
5. **Single Chapter** - Get specific chapter details
6. **Admin Operations** - Create new chapter

---

## 📋 Postman Testing Collection

### Import Collection:

File: `Chapter-Performance-API.postman_collection.json`

### Test Sequence:

1. **Health Check** - Verify API is running
2. **Get Chapters** - Test basic functionality
3. **Filtering Tests** - Subject, class, status
4. **Pagination Tests** - Different page/limit combinations
5. **Cache Tests** - Multiple identical requests
6. **Rate Limit Tests** - Rapid fire requests
7. **Admin Tests** - Chapter creation with auth
8. **Error Tests** - Invalid requests

---

## 🎯 Expected Test Results Summary

### ✅ Success Indicators:

1. **API Functionality (30/30)**

   - All endpoints return correct responses
   - Filtering works properly
   - Single chapter retrieval works
   - Admin operations function with auth

2. **Caching (15/15)**

   - First request shows `"cached": false`
   - Subsequent identical requests show `"cached": true`
   - Cache invalidation works after data changes

3. **Rate Limiting (10/10)**

   - 30 requests work normally
   - 31st request returns 429 status
   - Different IPs have separate limits

4. **Pagination (10/10)**

   - Correct page/limit handling
   - Proper metadata (totalPages, hasNext, etc.)
   - Works with filtering

5. **Code Quality (15/15)**
   - Clean error responses
   - Proper HTTP status codes
   - Modular file structure
   - Security headers present

### Total Expected Score: **90/100** (Excluding Deployment Bonus)

---

## 🚀 Quick Test Commands

### PowerShell Quick Test:

```powershell
# Test all major endpoints
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/chapters?limit=5
curl "http://localhost:3000/api/v1/chapters?subject=Physics&limit=3"
curl "http://localhost:3000/api/v1/chapters?page=2&limit=10"
```

### Browser Quick Test:

Visit: http://localhost:3000/test/test-web-ui.html

---

_All tests should be performed with the API running on port 3000 and database properly seeded with 101 chapters._
