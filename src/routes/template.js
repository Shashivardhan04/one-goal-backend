const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const templateController = require("../controllers/templateController");

const router = express.Router();

/**
 * 🛠 Utility function to handle async routes gracefully.
 * Ensures proper error handling and prevents repetitive try-catch blocks.
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`🚀 ${req.method} ${req.url} - Processing request`);
    await fn(req, res);
    logger.info(`✅ ${req.method} ${req.url} - Request successful`);
  } catch (error) {
    logger.error(`❌ ${req.method} ${req.url} - Error: ${error.message}`);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Internal Server Error",
      status: error.status || 500,
    });
  }
};

/**
 * 📝 Create Message Template
 * Stores a new message template in the database.
 */
router.post(
  "/createMessageTemplate",
  asyncHandler(templateController.createMessageTemplate)
);

/**
 * 🔍 Fetch Templates
 * Retrieves saved message templates.
 */
router.post("/fetchTemplates", asyncHandler(templateController.fetchTemplates));

module.exports = router;
