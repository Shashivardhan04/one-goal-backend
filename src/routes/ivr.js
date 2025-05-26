const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const ivrController = require("../controllers/ivrContoller");

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
 * 🔍 Soil Search IVR Insert
 * Handles insertion of soil search data via IVR request.
 */
router.get("/soilSearch", asyncHandler(ivrController.soilSearchIvrInsert));

module.exports = router;
