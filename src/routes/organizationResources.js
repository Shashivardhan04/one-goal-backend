const express = require("express");
const logger = require("../services/logger"); // Ensure the logger is properly imported
const organizationResourcesController = require("../controllers/organizationResourcesController");

const router = express.Router();

// Destructure controller functions for cleaner usage
const {
  Insert,
  Get,
  Update,
  Delete,
  createResource,
  fetchAll,
  updateOrg,
  deleteResource,
} = organizationResourcesController;

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
 * ➕ Add Organization Resource
 * Inserts a new organization resource.
 */
router.post("/add", asyncHandler(Insert));

/**
 * 📌 Fetch Organization Resource
 * Retrieves specific organization resource details.
 */
router.post("/get", asyncHandler(Get));

/**
 * 🔄 Update Organization Resource
 * Modifies an existing organization resource.
 */
router.post("/update", asyncHandler(Update));

/**
 * ❌ Delete Organization Resource
 * Removes an organization resource from the system.
 */
router.post("/delete", asyncHandler(Delete));

/**
 * 📌 Create a New Resource
 * Adds a structured resource within the organization.
 */
router.post("/createResource", asyncHandler(createResource));

/**
 * 📊 Fetch All Organization Resources
 * Retrieves all available resources within the organization.
 */
router.get("/fetchAll", asyncHandler(fetchAll));

/**
 * 🔄 Update Organization Data
 * Modifies organization-related configurations.
 */
router.put("/updateOrg", asyncHandler(updateOrg));

/**
 * 🗑️ Delete Resource
 * Deletes a specific resource within the organization.
 */
router.post("/deleteresource", asyncHandler(deleteResource));

module.exports = router;
