const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const projectsController = require("../controllers/projectsController");

const router = express.Router();

/**
 * 🛠 Utility function to handle async routes gracefully.
 * Prevents repetitive try-catch blocks by centralizing error handling.
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
 * 📂 Fetch All Projects
 * Retrieves all available projects.
 */
router.get("/fetchAll", asyncHandler(projectsController.FetchAll));

/**
 * 📊 Fetch All Projects (Detailed)
 * Retrieves detailed project data.
 */
router.get(
  "/fetchAllProjects",
  asyncHandler(projectsController.FetchAllProjects)
);

/**
 * ➕ Create a New Project
 * Handles project creation requests.
 */
router.post("/create", asyncHandler(projectsController.Create));

/**
 * ✏️ Update an Existing Project
 * Modifies project data.
 */
router.put("/update", asyncHandler(projectsController.Update));

/**
 * ❌ Delete a Project
 * Removes project data.
 */
router.post("/delete", asyncHandler(projectsController.Delete));

/**
 * 🔍 Filter Project Values
 * Retrieves distinct values for filtering projects.
 */
router.get("/filterValues", asyncHandler(projectsController.FilterValues));

module.exports = router;
