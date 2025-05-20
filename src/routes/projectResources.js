const express = require("express");
const logger = require("../services/logger"); // Ensure logger is properly imported
const projectResoController = require("../controllers/projectResourcesController");

const router = express.Router();

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
 * ➕ Add Attachment
 * Attaches a new resource to the project.
 */
router.post(
  "/addAttachment",
  asyncHandler(async (req, res) => {
    if (
      !req.body.project_id ||
      !req.body.organization_id ||
      !req.body.resource_type ||
      !req.body.attachment
    ) {
      logger.warn("⚠️ Missing required parameters for AddAttachment");
      return res.status(400).json({
        success: false,
        message: "Required parameters missing",
        status: 400,
      });
    }
    await projectResoController.AddAttachment(req, res);
  })
);

/**
 * 🗑️ Remove Attachment
 * Removes an attachment from the project.
 */
router.post(
  "/removeAttachment",
  asyncHandler(async (req, res) => {
    if (
      !req.body.project_id ||
      !req.body.organization_id ||
      !req.body.resource_type ||
      !req.body.attachment
    ) {
      logger.warn("⚠️ Missing required parameters for RemoveAttachment");
      return res.status(400).json({
        success: false,
        message: "Required parameters missing",
        status: 400,
      });
    }
    await projectResoController.RemoveAttachment(req, res);
  })
);

/**
 * 🔄 Update Project Resource
 * Updates project resource details.
 */
router.post(
  "/update",
  asyncHandler(async (req, res) => {
    if (!req.body.project_id || !req.body.organization_id) {
      logger.warn("⚠️ Missing required parameters for Update");
      return res.status(400).json({
        success: false,
        message: "Required parameters missing",
        status: 400,
      });
    }
    await projectResoController.Update(req, res);
  })
);

/**
 * ❌ Delete Project Resource
 * Deletes a project resource entry.
 */
router.post(
  "/delete",
  asyncHandler(async (req, res) => {
    if (!req.body.project_id) {
      logger.warn("⚠️ Missing required parameters for Delete");
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
        status: 400,
      });
    }
    await projectResoController.Delete(req, res);
  })
);

/**
 * 📊 Get Project Resource Data
 * Retrieves project resource data.
 */
router.post(
  "/getData",
  asyncHandler(async (req, res) => {
    if (!req.body.project_id || !req.body.organization_id) {
      logger.warn("⚠️ Missing required parameters for GetData");
      return res.status(400).json({
        success: false,
        message: "Required parameters missing",
        status: 400,
      });
    }
    await projectResoController.GetData(req, res);
  })
);

module.exports = router;
