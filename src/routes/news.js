const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const newsController = require("../controllers/newsController");

const router = express.Router();

// Destructure controller functions for cleaner usage
const { Insert, Update, FetchAll } = newsController;

/**
 * Utility function to handle async routes gracefully.
 * Ensures proper error handling and prevents repetitive try-catch blocks.
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`🚀 ${req.method} ${req.url} - Processing request`);
    await fn(req, res);
    logger.info(`✅ ${req.method} ${req.url} - Request successful`);
  } catch (error) {
    logger.error(`❌ ${req.method} ${req.url} - Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
};

/**
 * ➕ Create News Article
 * Inserts a new news article into the system.
 */
router.post("/create", asyncHandler(Insert));

/**
 * 📌 Fetch All News
 * Retrieves all stored news articles.
 */
router.get("/fetchAll", asyncHandler(FetchAll));

/**
 * 🔄 Update News Article
 * Modifies an existing news article.
 */
router.post("/update", asyncHandler(Update));

module.exports = router;
