const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const apiTokenController = require("../controllers/apiTokenController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Create, Update, FetchAll, FetchToken, FilterValues } =
  apiTokenController;

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
 * 📊 Fetch All API Tokens
 * Retrieves a list of all stored API tokens.
 */
router.get("/fetchAll", asyncHandler(FetchAll));

/**
 * ➕ Create API Token
 * Adds a new API token to the database.
 */
router.post("/create", asyncHandler(Create));

/**
 * 🔄 Update API Token
 * Modifies an existing API token in the database.
 */
router.put("/update", asyncHandler(Update));

/**
 * 🔍 Fetch Single API Token
 * Retrieves a specific API token based on provided parameters.
 */
router.get("/fetchOne", asyncHandler(FetchToken));

/**
 * 🔎 Filter API Tokens
 * Retrieves filtered API tokens based on query parameters.
 */
router.get("/filterValues", asyncHandler(FilterValues));

module.exports = router;
