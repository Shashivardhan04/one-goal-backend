const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const dataUploadRequestController = require("../controllers/dataUploadRequestController");

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
 * 📂 Fetch All Data Upload Requests
 * Handles fetching all uploaded data requests.
 */
router.get("/fetchAll", asyncHandler(dataUploadRequestController.FetchAll));

/**
 * 📤 Upload Contacts
 * Handles uploading contact data.
 */
router.post(
  "/uploadContacts",
  asyncHandler(dataUploadRequestController.UploadContacts)
);

/**
 * 🏗 Upload Projects
 * Handles uploading project data.
 */
router.post(
  "/uploadProjects",
  asyncHandler(dataUploadRequestController.UploadProjects)
);

module.exports = router;
