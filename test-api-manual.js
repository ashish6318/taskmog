#!/usr/bin/env node

/**
 * Manual API Testing Script for Chapter Performance API
 * This script tests all endpoints and functionality
 */

const https = require('http');
const querystring = require('querystring');

const BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'chapter-admin-secret-key-2024';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n🏥 Testing Health Check Endpoint', 'blue');
  log('================================', 'blue');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health',
      method: 'GET'
    });

    if (response.statusCode === 200 && response.body.success) {
      log('✅ Health check passed', 'green');
      log(`   Status: ${response.body.status}`);
      log(`   Uptime: ${response.body.uptime}s`);
    } else {
      log('❌ Health check failed', 'red');
      log(`   Status Code: ${response.statusCode}`);
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
  }
}

async function testChaptersList() {
  log('\n📚 Testing Chapters List Endpoint', 'blue');
  log('=================================', 'blue');
  
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/chapters',
      method: 'GET'
    });

    if (response.statusCode === 200 && response.body.success) {
      log('✅ Chapters list retrieved successfully', 'green');
      log(`   Total chapters: ${response.body.data.chapters.length}`);
      log(`   Current page: ${response.body.data.pagination.currentPage}`);
      log(`   Total pages: ${response.body.data.pagination.totalPages}`);
      log(`   Total count: ${response.body.data.pagination.totalCount}`);
    } else {
      log('❌ Chapters list failed', 'red');
      log(`   Status Code: ${response.statusCode}`);
    }
  } catch (error) {
    log(`❌ Chapters list error: ${error.message}`, 'red');
  }
}

async function testChaptersFiltering() {
  log('\n🔍 Testing Chapters Filtering', 'blue');
  log('=============================', 'blue');
  
  const filters = [
    { subject: 'Physics' },
    { class: 'Class 11' },
    { subject: 'Chemistry', class: 'Class 12' }
  ];

  for (const filter of filters) {
    try {
      const query = querystring.stringify(filter);
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/chapters?${query}`,
        method: 'GET'
      });

      if (response.statusCode === 200 && response.body.success) {
        log(`✅ Filter ${JSON.stringify(filter)} - Found ${response.body.data.chapters.length} chapters`, 'green');
      } else {
        log(`❌ Filter ${JSON.stringify(filter)} failed`, 'red');
      }
    } catch (error) {
      log(`❌ Filter ${JSON.stringify(filter)} error: ${error.message}`, 'red');
    }
  }
}

async function testSingleChapter() {
  log('\n📖 Testing Single Chapter Endpoint', 'blue');
  log('==================================', 'blue');
  
  try {
    // First get a chapter ID
    const listResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/chapters?limit=1',
      method: 'GET'
    });

    if (listResponse.body.data && listResponse.body.data.chapters.length > 0) {
      const chapterId = listResponse.body.data.chapters[0]._id;
      
      const response = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/chapters/${chapterId}`,
        method: 'GET'
      });

      if (response.statusCode === 200 && response.body.success) {
        log('✅ Single chapter retrieved successfully', 'green');
        log(`   Chapter: ${response.body.data.chapter}`);
        log(`   Subject: ${response.body.data.subject}`);
        log(`   Class: ${response.body.data.class}`);
      } else {
        log('❌ Single chapter failed', 'red');
        log(`   Status Code: ${response.statusCode}`);
      }
    } else {
      log('❌ No chapters available to test single chapter endpoint', 'red');
    }
  } catch (error) {
    log(`❌ Single chapter error: ${error.message}`, 'red');
  }
}

async function testCreateChapter() {
  log('\n➕ Testing Create Chapter Endpoint', 'blue');
  log('==================================', 'blue');
    const newChapter = {
    subject: 'Physics',
    chapter: 'Test Chapter for API',
    class: 'Class 12',
    unit: 'Test Unit',
    status: 'Not Started'
  };
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/chapters/single',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      }
    }, newChapter);

    if (response.statusCode === 201 && response.body.success) {
      log('✅ Chapter created successfully', 'green');
      log(`   Chapter ID: ${response.body.data._id}`);
      log(`   Chapter: ${response.body.data.chapter}`);
      return response.body.data._id;
    } else {
      log('❌ Chapter creation failed', 'red');
      log(`   Status Code: ${response.statusCode}`);
      log(`   Error: ${response.body.message || 'Unknown error'}`);
    }
  } catch (error) {
    log(`❌ Chapter creation error: ${error.message}`, 'red');
  }
  
  return null;
}

async function testRateLimiting() {
  log('\n🚦 Testing Rate Limiting', 'blue');
  log('========================', 'blue');
  
  const requests = [];
  
  // Make 35 requests rapidly (limit is 30/minute)
  for (let i = 0; i < 35; i++) {
    requests.push(makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health',
      method: 'GET'
    }));
  }

  try {
    const responses = await Promise.all(requests);
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
    
    log(`✅ Rate limiting test completed`, 'green');
    log(`   Successful requests: ${successCount}`);
    log(`   Rate limited requests: ${rateLimitedCount}`);
    
    if (rateLimitedCount > 0) {
      log('✅ Rate limiting is working correctly', 'green');
    } else {
      log('⚠️ Rate limiting might not be working as expected', 'yellow');
    }
  } catch (error) {
    log(`❌ Rate limiting test error: ${error.message}`, 'red');
  }
}

async function testAuthentication() {
  log('\n🔐 Testing Authentication', 'blue');
  log('=========================', 'blue');
    // Test without token
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/chapters/single',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { subject: 'Test' });

    if (response.statusCode === 401) {
      log('✅ Authentication required - Unauthorized access blocked', 'green');
    } else {
      log('❌ Authentication not working - Should be unauthorized', 'red');
    }
  } catch (error) {
    log(`❌ Authentication test error: ${error.message}`, 'red');
  }
  // Test with wrong token
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/chapters/single',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer wrong-token'
      }
    }, { subject: 'Test' });

    if (response.statusCode === 403) {
      log('✅ Invalid token rejected correctly', 'green');
    } else {
      log('❌ Invalid token not rejected', 'red');
    }
  } catch (error) {
    log(`❌ Invalid token test error: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('🧪 Chapter Performance API - Test Suite', 'bold');
  log('======================================', 'bold');
  
  await testHealthCheck();
  await testChaptersList();
  await testChaptersFiltering();
  await testSingleChapter();
  await testAuthentication();
  await testCreateChapter();
  await testRateLimiting();
  
  log('\n🎉 All tests completed!', 'bold');
  log('Check the results above for any failures.', 'yellow');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(error => {
    log(`❌ Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testChaptersList,
  testChaptersFiltering,
  testSingleChapter,
  testCreateChapter,
  testRateLimiting,
  testAuthentication
};
