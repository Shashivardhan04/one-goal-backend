const { CONSTANTS } = require("../constants/constants");
const logger = require("../services/logger");

const constantController = {};

/**
 * 🔍 Fetch Constants
 * Retrieves system constants based on predefined configurations.
 */
constantController.fetch = async (req, res) => {
  try {
    logger.info("📡 Fetching system constants");

    /** 🛑 Validate constants */
    if (!CONSTANTS || Object.keys(CONSTANTS).length === 0) {
      logger.warn("⚠️ System constants not found or empty");
      return res.status(404).json({
        success: false,
        message: "No constants available",
        status: 404,
      });
    }

    logger.info("✅ System constants retrieved successfully");
    return res.status(200).json({
      success: true,
      message: "Constants fetched successfully",
      status: 200,
      data: CONSTANTS,
    });
  } catch (error) {
    logger.error(`❌ Error fetching constants: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch constants",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = constantController;
