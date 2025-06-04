# Chapter Performance Dashboard API

A RESTful API backend for managing and analyzing chapter performance data with features like filtering, pagination, caching, and rate limiting.

## 🚀 Features

- **RESTful API Design** - Clean and intuitive API endpoints
- **MongoDB Integration** - Robust data storage with Mongoose ODM
- **Redis Caching** - High-performance caching for improved response times (graceful fallback)
- **Rate Limiting** - IP-based rate limiting with memory/Redis backend
- **Data Validation** - Comprehensive input validation and sanitization
- **File Upload Support** - JSON file upload for bulk chapter import
- **Advanced Filtering** - Multiple filter options with pagination
- **Analytics Dashboard** - Performance insights and statistics
- **Error Handling** - Graceful error handling with detailed responses
- **Security** - Helmet.js security headers and CORS configuration

## 📋 Requirements

- **Node.js** (v16.0.0 or higher)
- **MongoDB** (v4.4 or higher)
- **Redis** (v6.0 or higher) - Optional, graceful fallback to memory

## 🔧 Quick Start

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd chapter-performance-api
npm install
```

### 2. Environment Setup

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Update the environment variables:

```env
PORT=3000
NODE_ENV=development

# MongoDB (Required)
MONGODB_URI=mongodb://localhost:27017/chapter-performance-db

# Redis (Optional - graceful fallback to memory)
REDIS_URL=redis://localhost:6379

# Admin Authentication
ADMIN_SECRET_KEY=your-super-secret-admin-key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Cache Settings
CACHE_TTL=3600
```

### 3. Database Setup

**Option A: Local MongoDB**

```bash
# Install MongoDB locally or run via Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

**Option B: MongoDB Atlas (Cloud)**

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chapter-performance-db
```

### 4. Redis Setup (Optional)

**Option A: Local Redis**

```bash
# Install Redis locally or run via Docker
docker run -d -p 6379:6379 --name redis redis:latest
```

**Option B: Skip Redis**
The application will work without Redis using memory-based caching and rate limiting.

### 5. Seed Database (Optional)

```bash
node scripts/seed.js
```

### 6. Start the Server

```bash
npm start
# or
node server.js
```

The API will be available at `http://localhost:3000`

## 🧪 Testing

### Manual Testing

Visit these URLs in your browser:

- **Health Check**: http://localhost:3000/api/v1/health
- **All Chapters**: http://localhost:3000/api/v1/chapters
- **Filter by Subject**: http://localhost:3000/api/v1/chapters?subject=Physics
- **Pagination**: http://localhost:3000/api/v1/chapters?page=1&limit=5

### Automated Testing

```bash
# Install test dependencies
npm install axios

# Run API tests
node test-api.js
```

### Postman Collection

Import the provided Postman collection: `Chapter-Performance-API.postman_collection.json`

## 🌐 Deployment on Render

### Step-by-Step Render Deployment

1. **Create a new Web Service** on [Render](https://render.com)

2. **Connect your GitHub repository**

3. **Configure Build & Deploy Settings**:

   - **Root Directory**: `chapter-performance-api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Set Environment Variables** in Render Dashboard:

   ```
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-atlas-uri>
   REDIS_URL=<your-redis-cloud-uri>  # Optional
   ADMIN_SECRET_KEY=<your-strong-secret-key>
   RATE_LIMIT_WINDOW_MS=60000
   RATE_LIMIT_MAX_REQUESTS=30
   CACHE_TTL=3600
   ```

5. **Add Database Services** (Optional):

   - Add MongoDB service or use MongoDB Atlas
   - Add Redis service or use Redis Cloud

6. **Deploy** - Render will automatically build and deploy your API

### Database Setup for Render

**MongoDB Atlas (Recommended)**:

1. Create a free MongoDB Atlas cluster
2. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/chapter-performance-db`
3. Add to Render environment variables

**Redis Cloud (Optional)**:

1. Create a free Redis Cloud instance
2. Get connection URL: `redis://username:password@host:port`
3. Add to Render environment variables

## 🔑 Production Considerations

### Security

- Change `ADMIN_SECRET_KEY` to a strong, unique value
- Use HTTPS in production
- Configure CORS origins properly
- Keep dependencies updated

### Performance

- Enable Redis for better caching and rate limiting
- Monitor MongoDB performance and add indexes as needed
- Consider using a CDN for static assets

### Monitoring

- Set up error tracking (e.g., Sentry)
- Monitor API response times
- Set up uptime monitoring

## 📖 API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

Admin endpoints require Bearer token authentication:

```
Authorization: Bearer your-super-secret-admin-key
```

### Endpoints

#### 1. Get All Chapters

```http
GET /api/v1/chapters
```

**Query Parameters:**

- `subject` - Filter by subject (Physics, Chemistry, Mathematics)
- `class` - Filter by class (Class 11, Class 12)
- `unit` - Filter by unit
- `status` - Filter by status (Not Started, In Progress, Completed)
- `weakChapters` - Filter weak chapters (true/false)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

**Example:**

```bash
curl "http://localhost:3000/api/v1/chapters?subject=Physics&page=1&limit=20"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "chapters": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalChapters": 95,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 20
    }
  }
}
```

#### 2. Get Chapter by ID

```http
GET /api/v1/chapters/:id
```

**Example:**

```bash
curl "http://localhost:3000/api/v1/chapters/507f1f77bcf86cd799439011"
```

#### 3. Upload Chapters (Admin Only)

```http
POST /api/v1/chapters
Authorization: Bearer your-admin-token
```

**Options:**

1. **File Upload** - Upload JSON file

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  -F "chapters=@chapters.json" \
  "http://localhost:3000/api/v1/chapters"
```

2. **JSON Body** - Send JSON array in request body

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '[{"subject":"Physics","chapter":"Test","class":"Class 11","unit":"Test Unit"}]' \
  "http://localhost:3000/api/v1/chapters"
```

#### 4. Create Single Chapter (Admin Only)

```http
POST /api/v1/chapters/single
Authorization: Bearer your-admin-token
```

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Physics",
    "chapter": "Quantum Mechanics",
    "class": "Class 12",
    "unit": "Modern Physics",
    "questionSolved": 15,
    "status": "In Progress",
    "isWeakChapter": false
  }' \
  "http://localhost:3000/api/v1/chapters/single"
```

#### 5. Update Chapter (Admin Only)

```http
PUT /api/v1/chapters/:id
Authorization: Bearer your-admin-token
```

#### 6. Delete Chapter (Admin Only)

```http
DELETE /api/v1/chapters/:id
Authorization: Bearer your-admin-token
```

#### 7. Get Analytics

```http
GET /api/v1/chapters/analytics
```

**Response:**

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalChapters": 95,
      "completedChapters": 32,
      "inProgressChapters": 25,
      "notStartedChapters": 38,
      "weakChapters": 48,
      "completionPercentage": 34
    },
    "subjectDistribution": [...]
  }
}
```

#### 8. Get Filter Options

```http
GET /api/v1/chapters/filters
```

#### 9. Health Check

```http
GET /api/v1/health
```

## 🔧 Data Schema

### Chapter Model

```javascript
{
  subject: String,           // "Physics", "Chemistry", "Mathematics"
  chapter: String,           // Chapter name
  class: String,             // "Class 11", "Class 12"
  unit: String,              // Unit name
  yearWiseQuestionCount: {   // Object with year keys
    "2019": Number,
    "2020": Number,
    // ... more years
  },
  questionSolved: Number,    // Number of questions solved
  status: String,            // "Not Started", "In Progress", "Completed"
  isWeakChapter: Boolean,    // Whether it's a weak chapter
  createdAt: Date,           // Auto-generated
  updatedAt: Date            // Auto-generated
}
```

## 🔐 Security Features

- **Rate Limiting**: 30 requests per minute per IP
- **CORS Protection**: Configurable allowed origins
- **Security Headers**: Helmet.js protection
- **Input Validation**: Comprehensive data validation
- **Admin Authentication**: Bearer token authentication for admin routes

## 📊 Caching Strategy

- **Redis Caching**: 1-hour cache TTL for most endpoints
- **Cache Invalidation**: Automatic cache clearing on data changes
- **Cache Keys**: Structured cache key generation for efficient lookups

## 🚀 Production Deployment on Render

Your API is deployed and ready! Here's what you need:

### Environment Variables for Render

```env
NODE_ENV=production
PORT=10000  # Render will set this automatically
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chapter-performance-db
REDIS_URL=redis://username:password@host:port  # Optional
ADMIN_SECRET_KEY=strong-random-secret-key-change-this
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
CACHE_TTL=3600
```

### Post-Deployment Steps

1. **Test Your Deployed API**:

   - Health Check: `https://your-render-app.onrender.com/api/v1/health`
   - Get Chapters: `https://your-render-app.onrender.com/api/v1/chapters`

2. **Seed Your Database** (if needed):

   ```bash
   # Run this command in Render's console or via a manual deploy
   npm run seed
   ```

3. **Monitor Your Deployment**:
   - Check Render dashboard for logs
   - Monitor API performance
   - Set up uptime monitoring

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

## 🧪 Testing

You can test the API using the provided Postman collection or curl commands.

### Sample Test Commands

```bash
# Get all chapters
curl "http://localhost:3000/api/v1/chapters"

# Get filtered chapters
curl "http://localhost:3000/api/v1/chapters?subject=Physics&status=Completed"

# Health check
curl "http://localhost:3000/api/v1/health"

# Analytics
curl "http://localhost:3000/api/v1/chapters/analytics"
```

## 📂 Project Structure

```
chapter-performance-api/
├── src/
│   ├── config/          # Database and Redis configuration
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   └── app.js          # Express application setup
├── scripts/            # Database seeding and migration scripts
├── uploads/            # Temporary file uploads directory
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
└── server.js           # Application entry point
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the API documentation at `/api/v1`
- Review the health check endpoint at `/api/v1/health`

---

**Built with ❤️ using Node.js, Express, MongoDB, and Redis**
