const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const s3Controller = require("../controllers/s3Controller");

const router = express.Router();

/**
 * 🛠 Utility function to handle async routes gracefully.
 * Prevents repetitive try-catch blocks by centralizing error handling.
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
 * 📤 Data Upload to S3
 * Handles file uploads to Amazon S3.
 */
router.post("/dataUpload", asyncHandler(s3Controller.DataUpload));

/**
 * 🗑 Delete S3 File
 * Deletes a file from Amazon S3.
 */
router.delete("/deleteFile", asyncHandler(s3Controller.DeleteS3File));

module.exports = router;
