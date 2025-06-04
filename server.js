#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const App = require('./src/app');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    // Initialize application
    const appInstance = new App();
    const app = await appInstance.initialize();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${NODE_ENV} mode`);
    });    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      server.close(async () => {
        try {
          // Close database connections
          const mongoose = require('mongoose');
          await mongoose.connection.close();
          
          // Close Redis connection
          const { getRedisClient } = require('./src/config/redis');
          const redisClient = getRedisClient();
          if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
          }
          
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
        // Force shutdown after timeout
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      } else {
        console.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
