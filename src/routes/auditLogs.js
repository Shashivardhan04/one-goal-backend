const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const auditLogsController = require("../controllers/auditLogsController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { createExportLogs, fetchExportLogs } = auditLogsController;

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
 * 📝 Create Export Logs
 * Stores export log entries in the database.
 */
router.post("/createExportLogs", asyncHandler(createExportLogs));

/**
 * 🔍 Fetch Export Logs
 * Retrieves export logs based on provided parameters.
 */
router.post("/fetchExportLogs", asyncHandler(fetchExportLogs));

module.exports = router;
