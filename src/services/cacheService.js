const { getRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL) || 3600; // 1 hour
    this.cachePrefix = 'chapter-api:';
  }
  async get(key) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        return null;
      }

      const cachedData = await redisClient.get(`${this.cachePrefix}${key}`);
      return cachedData ? JSON.parse(cachedData) : null;
    } catch (error) {
      return null;
    }
  }
  async set(key, data, ttl = this.defaultTTL) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        return false;
      }

      await redisClient.setEx(
        `${this.cachePrefix}${key}`,
        ttl,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  async del(key) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        return false;
      }

      await redisClient.del(`${this.cachePrefix}${key}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  async invalidatePattern(pattern) {
    try {
      const redisClient = getRedisClient();
      if (!redisClient) {
        return false;
      }

      const keys = await redisClient.keys(`${this.cachePrefix}${pattern}`);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate cache key for chapters list
  generateChaptersListKey(filters, page, limit) {
    const keyParts = ['chapters'];
    
    if (filters.subject) keyParts.push(`subject:${filters.subject}`);
    if (filters.class) keyParts.push(`class:${filters.class}`);
    if (filters.unit) keyParts.push(`unit:${filters.unit}`);
    if (filters.status) keyParts.push(`status:${filters.status}`);
    if (filters.weakChapters !== undefined) keyParts.push(`weak:${filters.weakChapters}`);
    
    keyParts.push(`page:${page}`, `limit:${limit}`);
    
    return keyParts.join(':');
  }

  // Generate cache key for single chapter
  generateChapterKey(id) {
    return `chapter:${id}`;
  }

  // Invalidate all chapters cache when data changes
  async invalidateChaptersCache() {
    await this.invalidatePattern('chapters:*');
    await this.invalidatePattern('chapter:*');
  }
}

module.exports = new CacheService();
