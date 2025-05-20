const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const licenceTrackingController = require("../controllers/licenceTrackingController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Get, Getorg, Update } = licenceTrackingController;

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
 * 🔍 Get Licence Tracking Data
 * Fetches licence tracking information.
 */
router.get("/get", asyncHandler(Get));

/**
 * 🔍 Get Organisation Licence Tracking Data
 * Retrieves licence tracking details for a specific organization.
 */
router.post("/getorg", asyncHandler(Getorg));

/**
 * 🔄 Update Licence Tracking Data
 * Updates the licence tracking information.
 */
router.post("/update", asyncHandler(Update));

module.exports = router;
