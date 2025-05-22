const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const leadDistributionController = require("../controllers/leadDistributionController");

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
 * 🔄 Lead Distribution Routes
 * Handles lead distribution actions including create, update, delete, fetch, and filtering.
 */
router.post("/create", asyncHandler(leadDistributionController.create));
router.put("/update", asyncHandler(leadDistributionController.update));
router.post("/delete", asyncHandler(leadDistributionController.deleteLogic));
router.get("/fetchAll", asyncHandler(leadDistributionController.fetchAll));
router.get(
  "/filterValues",
  asyncHandler(leadDistributionController.filterValues)
);
router.get(
  "/count",
  asyncHandler(leadDistributionController.leadDistributionCount)
);

module.exports = router;
