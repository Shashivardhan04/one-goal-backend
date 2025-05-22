const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const apiQuestionsController = require("../controllers/apiQuestionsController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { getApiQuestions, addApiQuestions } = apiQuestionsController;

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
 * 🔍 Get API Questions
 * Retrieves a list of API-related questions.
 */
router.post("/get", asyncHandler(getApiQuestions));

/**
 * ➕ Add API Question
 * Stores a new API-related question in the database.
 */
router.post("/add", asyncHandler(addApiQuestions));

module.exports = router;
