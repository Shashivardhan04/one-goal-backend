const express = require("express");
const logger = require("../services/logger"); // Ensure the logger is properly imported
const fcmController = require("../controllers/fcmTokenController");
const router = express.Router();

// Destructuring controller functions for cleaner usage
const { Insert, Update } = fcmController;

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
 * Confirms that the FCM Token API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /fcmToken - Health check route hit");
  res.send("You are in fcmToken");
});

/**
 * ➕ Create FCM Token
 * Registers a new FCM token in the system.
 */
router.post("/Create", asyncHandler(Insert));

/**
 * 🔄 Update FCM Token
 * Updates an existing FCM token with new details.
 */
router.put("/Update", asyncHandler(Update));

module.exports = router;
