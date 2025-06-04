const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          // Don't reconnect in development, stop after 3 retries in production
          if (process.env.NODE_ENV === 'development') return false;
          if (retries > 3) return false;
          return Math.min(retries * 1000, 3000);
        }
      }
    });    redisClient.on('error', (err) => {
      // Redis connection error
    });

    redisClient.on('ready', () => {
      // Redis connected
    });

    redisClient.on('end', () => {
      // Redis connection ended
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    
    return true;
  } catch (error) {
    redisClient = null;
    return false;
  }
};

const getRedisClient = () => {
  if (!redisClient || !redisClient.isOpen) {
    return null;
  }
  return redisClient;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
});

module.exports = {
  connectRedis,
  getRedisClient
};
