const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapterController');
const { checkAdminAuth } = require('../middleware/auth');
const {
  chapterValidationRules,
  queryValidationRules,
  objectIdValidationRules,
  handleValidationErrors
} = require('../middleware/validation');

// Public routes
router.get(
  '/',
  queryValidationRules(),
  handleValidationErrors,
  chapterController.getAllChapters
);

router.get(
  '/analytics',
  chapterController.getAnalytics
);

router.get(
  '/filters',
  chapterController.getFilterOptions
);

router.get(
  '/:id',
  objectIdValidationRules(),
  handleValidationErrors,
  chapterController.getChapterById
);

// Admin only routes
router.post(
  '/',
  checkAdminAuth,
  chapterController.uploadFile(),
  chapterController.uploadChapters
);

router.post(
  '/single',
  checkAdminAuth,
  chapterValidationRules(),
  handleValidationErrors,
  chapterController.createChapter
);

router.put(
  '/:id',
  checkAdminAuth,
  objectIdValidationRules(),
  chapterValidationRules(),
  handleValidationErrors,
  chapterController.updateChapter
);

router.delete(
  '/:id',
  checkAdminAuth,
  objectIdValidationRules(),
  handleValidationErrors,
  chapterController.deleteChapter
);

module.exports = router;
