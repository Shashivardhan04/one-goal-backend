const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const lastDialedCallLogController = require("../controllers/lastDialedCallLogController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { create, fetchAndVerify } = lastDialedCallLogController;

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
 * 📞 Create Last Dialed Call Log
 * Stores call log data in the database.
 */
router.post("/create", asyncHandler(create));

/**
 * 🔍 Fetch & Verify Last Dialed Call Log
 * Retrieves and verifies the last call log based on given parameters.
 */
router.post("/fetchAndVerify", asyncHandler(fetchAndVerify));

module.exports = router;
