const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const smsController = require("../controllers/smsController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { addSmsServiceData, triggerSMS, getOrganizationSms } = smsController;

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
 * ➕ Add SMS Service Data
 * Stores SMS service details for future processing.
 */
router.post("/add", asyncHandler(addSmsServiceData));

/**
 * 📤 Trigger SMS
 * Sends an SMS based on request data.
 */
router.post("/sendSms", asyncHandler(triggerSMS));

/**
 * 🔍 Get Organization SMS Data
 * Fetches stored SMS data for an organization.
 */
router.post("/", asyncHandler(getOrganizationSms));

module.exports = router;
