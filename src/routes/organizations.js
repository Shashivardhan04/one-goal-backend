const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const organizationController = require("../controllers/organizationController");

const router = express.Router();

// Destructure controller functions for cleaner usage
const {
  Insert,
  updateData,
  fetch,
  createOrganizationWithAuth,
  updateOrganization,
  fetchAll,
  fetchSingleOrganization,
} = organizationController;

/**
 * Utility function to handle async routes gracefully.
 * Ensures proper error handling and prevents repetitive try-catch blocks.
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`🚀 ${req.method} ${req.url} - Processing request`);
    await fn(req, res);
    logger.info(`✅ ${req.method} ${req.url} - Request successful`);
  } catch (error) {
    logger.error(`❌ ${req.method} ${req.url} - Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      status: 500,
    });
  }
};

/**
 * 🧪 Health Check Route
 * Confirms that the Organization API is accessible.
 */
router.get("/", (req, res) => {
  logger.info("🟢 /organizations - Health check route hit");
  res.send("You are at organizations");
});

/**
 * ➕ Create Organization
 * Registers a new organization in the system.
 */
router.post("/create", asyncHandler(Insert));

/**
 * 🔄 Update Organization Data
 * Modifies specific organization details.
 */
router.post("/updateData", asyncHandler(updateData));

/**
 * 📌 Fetch Organization Data
 * Retrieves specific organization details.
 */
router.post("/fetch", asyncHandler(fetch));

/**
 * 🔑 Create Organization with Authentication
 * Registers an organization requiring authentication.
 */
router.post("/createOrg", asyncHandler(createOrganizationWithAuth));

/**
 * 🔄 Update Organization
 * Modifies organization-related configurations.
 */
router.put("/updateOrg", asyncHandler(updateOrganization));

/**
 * 📊 Fetch All Organizations
 * Retrieves a list of all available organizations.
 */
router.get("/fetchAll", asyncHandler(fetchAll));

/**
 * 🏢 Fetch Single Organization
 * Retrieves details of a specific organization.
 */
router.get("/fetchSingleOrganization", asyncHandler(fetchSingleOrganization));

module.exports = router;
