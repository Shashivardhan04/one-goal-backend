require("dotenv").config();
const jwt = require("jsonwebtoken");
const logger = require("../services/logger"); // Ensure logger is properly imported

const secret = process.env.NEW_TOKEN_KEY;

/**
 * 🔑 Verify JWT Token Middleware
 * Validates the JWT token from headers and attaches decoded user info to the request.
 */
const verifyToken = (req, res, next) => {
  try {
    /** 🛑 Extract token from headers */
    const token =
      req.headers["x-access-token"] || req.headers.authorization?.split(" ")[1];

    if (!token) {
      logger.warn("⚠️ Token missing - Authentication required");
      return res.status(403).json({
        success: false,
        message: "A token is required for authentication",
        status: 403,
      });
    }

    /** 🔍 Verify token */
    const decoded = jwt.verify(token, secret);
    req.user = decoded;

    logger.info(
      `✅ Token verified successfully for user: ${decoded.id || "unknown"}`
    );
    return next();
  } catch (err) {
    logger.error(`❌ Token verification failed - ${err.message}`);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
      error: err.message,
      status: 401,
    });
  }
};

module.exports = verifyToken;
