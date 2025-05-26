const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const automatedScoreController = require("../controllers/automatedScoreController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { createWeights, calculation } = automatedScoreController;

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
 * ⚖️ Create Weights
 * Stores weighted parameters for automated scoring logic.
 */
router.post("/Create", asyncHandler(createWeights));

/**
 * 🔢 Perform Calculation
 * Computes scores using predefined weight parameters.
 */
router.post("/calculation", asyncHandler(calculation));

module.exports = router;
