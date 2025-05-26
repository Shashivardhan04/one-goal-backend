const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const faqController = require("../controllers/faqController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Create, Update, FetchAll, Delete } = faqController;

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
 * 📊 Fetch All FAQs
 * Retrieves a list of all stored FAQs.
 */
router.get("/fetchAll", asyncHandler(FetchAll));

/**
 * ➕ Create FAQ
 * Adds a new FAQ entry to the database.
 */
router.post("/create", asyncHandler(Create));

/**
 * 🔄 Update FAQ
 * Modifies an existing FAQ entry in the database.
 */
router.put("/update", asyncHandler(Update));

/**
 * ❌ Delete FAQ
 * Removes an existing FAQ entry from the database.
 */
router.post("/delete", asyncHandler(Delete));

module.exports = router;
