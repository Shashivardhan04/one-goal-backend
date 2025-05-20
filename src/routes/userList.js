const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const userListController = require("../controllers/userListsController");

const router = express.Router();

// Destructure controller functions for cleaner usage
const { Insert, Update } = userListController;

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
 * Confirms that the User List API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /userList - Health check route hit");
  res.send("You are in userList");
});

/**
 * ➕ Create User List Entry
 * Inserts a new user list entry into the system.
 */
router.post("/create", asyncHandler(Insert));

/**
 * 🔄 Update User List Entry
 * Modifies an existing user list entry.
 */
router.post("/update", asyncHandler(Update));

module.exports = router;
