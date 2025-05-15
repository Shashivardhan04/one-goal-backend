const express = require("express");
const logger = require("../services/logger"); // Ensure the logger is properly imported
const countController = require("../controllers/countController");
const router = express.Router();

// Destructuring controller functions for cleaner usage
const { Count } = countController;

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
 * 🧪 Health Check Route
 * Confirms that the Count API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /counts - Health check route hit");
  res.send("You are in counts");
});

/**
 * 📊 Count Data
 * Processes count-related data, ensuring validation and error handling.
 */
router.post("/Count", asyncHandler(Count));

module.exports = router;
