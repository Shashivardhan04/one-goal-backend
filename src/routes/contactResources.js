const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const contactResoController = require("../controllers/contactResourceController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Insert, Update } = contactResoController;

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
 * 🧪 Health Check Route
 * Confirms the Contact Resources API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /contactResources - Health check route hit");
  res.send("You are in contactResources");
});

/**
 * ➕ Insert Contact Resource
 * Adds a new contact resource to the database.
 */
router.post("/create", asyncHandler(Insert));

/**
 * 🔄 Update Contact Resource
 * Modifies an existing contact resource.
 */
router.post("/update", asyncHandler(Update));

module.exports = router;
