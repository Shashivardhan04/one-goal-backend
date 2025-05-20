const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const bookingController = require("../controllers/bookingController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { Create, Update, Delete, Details, BookingList, BookingCount } =
  bookingController;

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
 * ➕ Create Booking
 * Inserts a new booking record into the system.
 */
router.post("/create", asyncHandler(Create));

/**
 * 🔄 Update Booking
 * Updates an existing booking record.
 */
router.put("/update", asyncHandler(Update));

/**
 * ❌ Delete Booking
 * Removes a booking record from the system.
 */
router.delete("/delete", asyncHandler(Delete));

/**
 * 🔍 Retrieve Booking Details
 * Fetches detailed information for a specific booking.
 */
router.post("/details", asyncHandler(Details));

/**
 * 📋 Get Booking List
 * Retrieves a paginated list of booking records.
 */
router.post("/booking", asyncHandler(BookingList));

/**
 * 📊 Get Booking Count
 * Retrieves the total number of bookings.
 */
router.post("/bookingcount", asyncHandler(BookingCount));

module.exports = router;
