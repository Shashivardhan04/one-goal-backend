const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const notificationController = require("../controllers/notificationController");
const { MESSAGES } = require("../constants/constants");

const router = express.Router();

// Destructure controller methods for cleaner usage
const {
  addNewNotification,
  deleteNotification,
  updateNotifications,
  getNotifications,
  sendNotifications,
} = notificationController;

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
      message: MESSAGES.catchError || "Internal Server Error",
      error: error.message,
      status: error.status || 500,
    });
  }
};

/**
 * ➕ Add Notification
 * Stores a new notification in the database.
 */
router.post("/add", asyncHandler(addNewNotification));

/**
 * ❌ Delete Notification
 * Removes an existing notification from the database.
 */
router.post("/delete", asyncHandler(deleteNotification));

/**
 * 🔄 Update Notification
 * Modifies an existing notification entry.
 */
router.post("/update", asyncHandler(updateNotifications));

/**
 * 🔍 Get Notifications
 * Retrieves notifications for an organization.
 */
router.post("/get", asyncHandler(getNotifications));

/**
 * 📢 Send Notification
 * Sends a notification based on the request payload.
 */
router.post("/sendNotifications", asyncHandler(sendNotifications));

module.exports = router;
