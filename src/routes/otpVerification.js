const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const otpVerificationController = require("../controllers/otpVerificationController");

const router = express.Router();

// Destructure controller methods for cleaner usage
const { sendOtpVerification, sendOtpVerificationNew, verifyOtp, resendOtp } =
  otpVerificationController;

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
 * 🔒 Send OTP Verification
 * Initiates OTP verification process.
 */
router.post("/sendOtp", asyncHandler(sendOtpVerification));

/**
 * 🔒 Send New OTP Verification
 * Handles a new variant of OTP verification.
 */
router.post("/sendOtpNew", asyncHandler(sendOtpVerificationNew));

/**
 * ✅ Verify OTP
 * Verifies the received OTP.
 */
router.post("/verifyOtp", asyncHandler(verifyOtp));

/**
 * 🔄 Resend OTP
 * Resends OTP if the previous one expired or was lost.
 */
router.post("/resendOtp", asyncHandler(resendOtp));

module.exports = router;
