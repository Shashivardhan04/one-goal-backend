const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const userAuthorizationController = require("../controllers/userAuthorizationController");

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
 * 🔍 Fetch User Authorization
 * Retrieves authorization details for a user.
 */
router.get(
  "/get",
  asyncHandler(userAuthorizationController.fetchUserAuthorization)
);

/**
 * 🔄 Update User Authorization
 * Modifies authorization settings for a user.
 */
router.post(
  "/update",
  asyncHandler(userAuthorizationController.updateUserAuthorization)
);

module.exports = router;
