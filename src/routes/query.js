const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const queryController = require("../controllers/queryController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { addQuery, getQueries } = queryController;

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
 * 🔍 Get Queries
 * Retrieves a list of queries for the frontend.
 */
router.get("/getqueries", asyncHandler(getQueries));

/**
 * ➕ Add Query
 * Stores a new query in the database.
 */
router.post("/addQuery", asyncHandler(addQuery));

module.exports = router;
