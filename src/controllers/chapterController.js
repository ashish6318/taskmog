const chapterService = require('../services/chapterService');
const multer = require('multer');
const fs = require('fs').promises;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

class ChapterController {
  // GET /api/v1/chapters - Get all chapters with filtering and pagination
  async getAllChapters(req, res, next) {
    try {      const {
        subject,
        class: className,
        unit,
        status,
        weakChapters,
        page = 1,
        limit = 10
      } = req.query;

      // Build filters object
      const filters = {};
      if (subject) filters.subject = subject;
      if (className) filters.class = className;
      if (unit) filters.unit = unit;
      if (status) filters.status = status;
      if (weakChapters !== undefined) filters.weakChapters = weakChapters;

      const result = await chapterService.getAllChapters(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/chapters/:id - Get single chapter by ID
  async getChapterById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await chapterService.getChapterById(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/chapters - Upload chapters (Admin only)
  async uploadChapters(req, res, next) {
    try {
      let chaptersData;

      if (req.file) {
        // Handle file upload
        try {
          const fileContent = await fs.readFile(req.file.path, 'utf8');
          chaptersData = JSON.parse(fileContent);
          
          // Clean up uploaded file
          await fs.unlink(req.file.path);
        } catch (error) {
          // Clean up uploaded file even if parsing fails
          try {
            await fs.unlink(req.file.path);
          } catch (unlinkError) {
            console.error('Error cleaning up uploaded file:', unlinkError);
          }
          
          return res.status(400).json({
            success: false,
            error: 'Invalid JSON file format'
          });
        }
      } else if (req.body && Array.isArray(req.body)) {
        // Handle JSON body
        chaptersData = req.body;
      } else {
        return res.status(400).json({
          success: false,
          error: 'Please provide chapters data as JSON array in request body or upload a JSON file'
        });
      }

      if (!Array.isArray(chaptersData)) {
        return res.status(400).json({
          success: false,
          error: 'Chapters data must be an array'
        });
      }

      if (chaptersData.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Chapters array cannot be empty'
        });
      }

      // Filter out invalid chapters (with missing required fields)
      const validChapters = chaptersData.filter(chapter => 
        chapter && 
        typeof chapter === 'object' && 
        chapter.subject && 
        chapter.chapter && 
        chapter.class && 
        chapter.unit
      );

      if (validChapters.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No valid chapters found in the data'
        });
      }

      const result = await chapterService.createChapters(validChapters);

      const statusCode = result.success ? (result.data.failed.length > 0 ? 207 : 201) : 400;
      
      res.status(statusCode).json({
        ...result,
        message: `${result.data.successful.length} chapters created successfully, ${result.data.failed.length} failed`
      });
    } catch (error) {      // Clean up uploaded file if error occurs
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          // Error cleaning up file
        }
      }
      next(error);
    }
  }

  // POST /api/v1/chapters/single - Create single chapter (Admin only)
  async createChapter(req, res, next) {
    try {
      const result = await chapterService.createChapter(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/v1/chapters/:id - Update chapter (Admin only)
  async updateChapter(req, res, next) {
    try {
      const { id } = req.params;
      const result = await chapterService.updateChapter(id, req.body);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/v1/chapters/:id - Delete chapter (Admin only)
  async deleteChapter(req, res, next) {
    try {
      const { id } = req.params;
      const result = await chapterService.deleteChapter(id);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/chapters/analytics - Get analytics data
  async getAnalytics(req, res, next) {
    try {
      const result = await chapterService.getAnalytics();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/chapters/filters - Get available filter options
  async getFilterOptions(req, res, next) {
    try {
      const result = await chapterService.getFilterOptions();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Middleware for file upload
  uploadFile() {
    return upload.single('chapters');
  }
}

module.exports = new ChapterController();
