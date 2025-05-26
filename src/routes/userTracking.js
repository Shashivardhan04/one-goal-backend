const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const userTrackingController = require("../controllers/userTrackingController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const {
  getTrackingForDate,
  updateTrackingForDate,
  getUsersListForTracking,
  updateUserTrackingStatus,
  insertTrackingData,
  updateLiveTrackingStatus,
} = userTrackingController;

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
 * 🔍 Get Tracking Data for a Specific Date
 * Retrieves user tracking information for a given date.
 */
router.post("/get", asyncHandler(getTrackingForDate));

/**
 * 🔄 Update Tracking Data for a Specific Date
 * Modifies existing tracking records for a given date.
 */
router.post("/update", asyncHandler(updateTrackingForDate));

/**
 * 📊 Get Users List for Tracking
 * Fetches the list of users that require tracking.
 */
router.post("/getUsersList", asyncHandler(getUsersListForTracking));

/**
 * ✅ Update User Tracking Status
 * Updates the tracking status of a specific user.
 */
router.post(
  "/updateUserTrackingStatus",
  asyncHandler(updateUserTrackingStatus)
);

/**
 * ➕ Insert Tracking Data
 * Adds new tracking data entries to the system.
 */
router.post("/insertTrackingData", asyncHandler(insertTrackingData));

/**
 * 🔄 Update Live Tracking Status
 * Modifies live tracking status for real-time updates.
 */
router.post(
  "/updateLiveTrackingStatus",
  asyncHandler(updateLiveTrackingStatus)
);

module.exports = router;
