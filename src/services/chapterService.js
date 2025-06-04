const Chapter = require('../models/Chapter');
const cacheService = require('./cacheService');

class ChapterService {
  // Get all chapters with filtering, pagination, and caching
  async getAllChapters(filters = {}, page = 1, limit = 10) {
    try {
      // Generate cache key
      const cacheKey = cacheService.generateChaptersListKey(filters, page, limit);
        // Try to get from cache first
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Build query
      const query = {};
      
      if (filters.subject) query.subject = filters.subject;
      if (filters.class) query.class = filters.class;
      if (filters.unit) query.unit = filters.unit;
      if (filters.status) query.status = filters.status;
      if (filters.weakChapters !== undefined) {
        query.isWeakChapter = filters.weakChapters === 'true';
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [chapters, totalChapters] = await Promise.all([
        Chapter.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Chapter.countDocuments(query)
      ]);

      // Calculate pagination info
      const totalPages = Math.ceil(totalChapters / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const result = {
        success: true,
        data: {
          chapters,
          pagination: {
            currentPage: page,
            totalPages,
            totalChapters,
            hasNextPage,
            hasPrevPage,
            limit
          }
        }
      };

      // Cache the result
      await cacheService.set(cacheKey, result);      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get single chapter by ID with caching
  async getChapterById(id) {
    try {
      // Generate cache key
      const cacheKey = cacheService.generateChapterKey(id);
        // Try to get from cache first
      const cachedChapter = await cacheService.get(cacheKey);
      if (cachedChapter) {
        return cachedChapter;
      }

      const chapter = await Chapter.findById(id).lean();
      
      if (!chapter) {
        return {
          success: false,
          error: 'Chapter not found'
        };
      }

      const result = {
        success: true,
        data: chapter
      };

      // Cache the result
      await cacheService.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error in getChapterById:', error);
      throw error;
    }
  }

  // Create multiple chapters (bulk upload)
  async createChapters(chaptersData) {
    try {
      const results = {
        success: true,
        data: {
          successful: [],
          failed: []
        }
      };

      // Process each chapter
      for (let i = 0; i < chaptersData.length; i++) {
        try {
          const chapterData = chaptersData[i];
          
          // Validate and create chapter
          const chapter = new Chapter(chapterData);
          const savedChapter = await chapter.save();
          
          results.data.successful.push({
            index: i,
            chapter: savedChapter.toObject(),
            message: 'Successfully created'
          });
        } catch (error) {
          results.data.failed.push({
            index: i,
            chapter: chaptersData[i],
            error: error.message
          });
        }
      }

      // Invalidate cache after successful operations
      if (results.data.successful.length > 0) {
        await cacheService.invalidateChaptersCache();
      }

      // Set overall success based on whether any chapters were created
      results.success = results.data.successful.length > 0;
      
      return results;
    } catch (error) {
      console.error('Error in createChapters:', error);
      throw error;
    }
  }

  // Create single chapter
  async createChapter(chapterData) {
    try {
      const chapter = new Chapter(chapterData);
      const savedChapter = await chapter.save();

      // Invalidate cache
      await cacheService.invalidateChaptersCache();

      return {
        success: true,
        data: savedChapter.toObject()
      };
    } catch (error) {
      console.error('Error in createChapter:', error);
      throw error;
    }
  }

  // Update chapter
  async updateChapter(id, updateData) {
    try {
      const chapter = await Chapter.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).lean();

      if (!chapter) {
        return {
          success: false,
          error: 'Chapter not found'
        };
      }

      // Invalidate cache
      await cacheService.invalidateChaptersCache();

      return {
        success: true,
        data: chapter
      };
    } catch (error) {
      console.error('Error in updateChapter:', error);
      throw error;
    }
  }

  // Delete chapter
  async deleteChapter(id) {
    try {
      const chapter = await Chapter.findByIdAndDelete(id);

      if (!chapter) {
        return {
          success: false,
          error: 'Chapter not found'
        };
      }

      // Invalidate cache
      await cacheService.invalidateChaptersCache();

      return {
        success: true,
        message: 'Chapter deleted successfully'
      };
    } catch (error) {
      console.error('Error in deleteChapter:', error);
      throw error;
    }
  }

  // Get analytics data
  async getAnalytics() {
    try {
      const cacheKey = 'analytics:overview';
      
      // Try cache first
      const cachedAnalytics = await cacheService.get(cacheKey);
      if (cachedAnalytics) {
        return cachedAnalytics;
      }

      const [
        totalChapters,
        completedChapters,
        inProgressChapters,
        notStartedChapters,
        weakChapters,
        subjectDistribution
      ] = await Promise.all([
        Chapter.countDocuments(),
        Chapter.countDocuments({ status: 'Completed' }),
        Chapter.countDocuments({ status: 'In Progress' }),
        Chapter.countDocuments({ status: 'Not Started' }),
        Chapter.countDocuments({ isWeakChapter: true }),
        Chapter.aggregate([
          {
            $group: {
              _id: '$subject',
              count: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
              },
              weakChapters: {
                $sum: { $cond: ['$isWeakChapter', 1, 0] }
              }
            }
          }
        ])
      ]);

      const result = {
        success: true,
        data: {
          overview: {
            totalChapters,
            completedChapters,
            inProgressChapters,
            notStartedChapters,
            weakChapters,
            completionPercentage: totalChapters ? Math.round((completedChapters / totalChapters) * 100) : 0
          },
          subjectDistribution
        }
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, result, 1800);

      return result;
    } catch (error) {
      console.error('Error in getAnalytics:', error);
      throw error;
    }
  }

  // Get filter options
  async getFilterOptions() {
    try {
      const cacheKey = 'filters:options';
      
      const cachedOptions = await cacheService.get(cacheKey);
      if (cachedOptions) {
        return cachedOptions;
      }

      const options = await Chapter.getFilterOptions();
      
      const result = {
        success: true,
        data: options
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Error in getFilterOptions:', error);
      throw error;
    }
  }
}

module.exports = new ChapterService();
