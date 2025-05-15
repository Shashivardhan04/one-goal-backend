const express = require("express");
const logger = require("../services/logger"); // Ensure the logger is properly imported
const apiDataController = require("../controllers/apiDataController");
const router = express.Router();

// Destructuring controller functions for cleaner usage
const { FetchAll, FilterValues, CreateAPILead, CreateAPILeadWithoutToken } =
  apiDataController;

/**
 * Utility function to handle async routes gracefully.
 * It automatically catches errors and prevents repetitive try-catch blocks inside each route.
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
 * 🛠️ Fetch all API data
 * This route retrieves all stored API data.
 */
router.get("/fetchAll", asyncHandler(FetchAll));

/**
 * 🔍 Get filtered values
 * This route retrieves API data based on specific filters.
 */
router.get("/filterValues", asyncHandler(FilterValues));

/**
 * ➕ Create a new API lead
 * This route inserts a new lead into the database with authentication.
 */
router.post("/createAPILead", asyncHandler(CreateAPILead));

/**
 * ➕ Create a new API lead without authentication
 * This route allows lead creation without requiring authentication.
 */
router.post(
  "/createAPILeadWithoutToken",
  asyncHandler(CreateAPILeadWithoutToken)
);

module.exports = router;
