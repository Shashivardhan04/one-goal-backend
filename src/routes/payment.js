const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const paymentController = require("../controllers/paymentController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Create, Verification, Search, CreatePdf, Get } = paymentController;

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
 * ➕ Create Payment Order
 * Initiates a new payment order and returns order details.
 */
router.post("/createorder", asyncHandler(Create));

/**
 * ✅ Payment Verification
 * Verifies payment status and updates transaction records.
 */
router.post("/paymentverification", asyncHandler(Verification));

/**
 * 🔎 Search Payment Records
 * Retrieves payment details based on search parameters.
 */
router.post("/search", asyncHandler(Search));

/**
 * 📄 Generate Payment Receipt PDF
 * Creates a PDF receipt for a completed transaction.
 */
router.post("/createpdf", asyncHandler(CreatePdf));

/**
 * 📊 Get Payment Data
 * Fetches general payment tracking and statistics.
 */
router.get("/get", asyncHandler(Get));

module.exports = router;
