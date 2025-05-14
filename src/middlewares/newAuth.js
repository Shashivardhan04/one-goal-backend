const jwt = require("jsonwebtoken");
const userModel = require("../models/userSchema");
const logger = require("../services/logger"); // Ensure logger is properly imported

/**
 * 🔐 Authentication Middleware
 * Validates JWT token, checks user status, and ensures session integrity before proceeding.
 */
const authMiddleware = async (req, res, next) => {
  try {
    /** 🛑 Extract token from headers */
    const token =
      req.headers["x-access-token"] || req.headers.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("⚠️ Missing required token - Authentication required");
      return res.status(401).json({
        success: false,
        message: "Your session has expired, please login again!",
        status: 401,
      });
    }

    /** 🔍 Check if token matches a predefined header-based access key */
    if (token === process.env.newaccesstokeninheader) {
      logger.info(
        "✅ Token matches predefined header key - Skipping validation"
      );
      return next();
    }

    /** 🔑 Verify JWT Token */
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info(`📡 Token verification successful for UID: ${decoded.uid}`);

    /** 🔍 Fetch user details */
    const user = await userModel.findOne({ uid: decoded.uid });

    /** 🛑 Validate if user exists */
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${decoded.uid}`);
      return res.status(401).json({
        success: false,
        message: "User not found!",
        status: 401,
      });
    }

    /** 🛑 Check if user is inactive */
    if (user.status === "INACTIVE") {
      logger.warn(`⚠️ User is inactive - UID: ${decoded.uid}`);
      return res.status(402).json({
        success: false,
        message: "User is inactive, please contact your admin",
        status: 402,
      });
    }

    /** 🛑 Validate session integrity */
    if (
      user.session_id !== decoded.session_id ||
      user.device_type !== decoded.device_type
    ) {
      logger.warn(`⚠️ Session expired for UID: ${decoded.uid}`);
      return res.status(401).json({
        success: false,
        message: "Your session has expired, please login again!",
        status: 401,
      });
    }

    /** ✅ Attach user data to request */
    req.user = user;
    logger.info(`🔓 Authentication successful for UID: ${decoded.uid}`);
    return next();
  } catch (error) {
    logger.error(
      `❌ Authentication error for UID ${req.body?.uid || "Unknown"}: ${
        error.message
      }`
    );
    return res.status(401).json({
      success: false,
      message: "Your session has expired, please login again!",
      error: error.message,
      status: 401,
    });
  }
};

module.exports = authMiddleware;
