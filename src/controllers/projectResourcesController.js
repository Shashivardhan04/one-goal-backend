var ObjectId = require("mongoose").Types.ObjectId;

const projectResoucesModel = require("../models/projectResourcesSchema");
const userAuthorizationModel = require("../models/userAuthorizationSchema.js");
const logger = require("../services/logger");

const projectResourcesController = {};

/**
 * 📌 Add Attachment
 * Adds a new attachment to the specified project resource.
 */
projectResourcesController.AddAttachment = async (req, res) => {
  try {
    const { project_id, organization_id, attachment, resource_type } = req.body;

    /** 🛑 Validate required fields */
    if (!project_id || !organization_id || !attachment || !resource_type) {
      logger.warn("⚠️ Missing required fields for AddAttachment");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `📡 Adding ${resource_type} attachment to project ID: ${project_id}`
    );

    /** 🔄 Prepare update object */
    const update = {
      $push: { [resource_type]: { ...attachment, created_at: new Date() } },
    };
    const query = { organization_id, project_id };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    /** 🚀 Execute update */
    await projectResourcesModel.findOneAndUpdate(query, update, options);

    logger.info(
      `✅ Attachment added successfully to project ID: ${project_id}`
    );
    return res
      .status(200)
      .json({ success: true, message: "Project resource added", status: 200 });
  } catch (error) {
    logger.error(
      `❌ Error adding attachment to project ID ${req.body.project_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🗑️ Remove Attachment
 * Removes an attachment from the specified project resource.
 */
projectResourcesController.RemoveAttachment = async (req, res) => {
  try {
    const { project_id, organization_id, attachment, resource_type } = req.body;

    /** 🛑 Validate required fields */
    if (!project_id || !organization_id || !attachment || !resource_type) {
      logger.warn("⚠️ Missing required fields for RemoveAttachment");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `📡 Removing ${resource_type} attachment from project ID: ${project_id}`
    );

    /** 🔄 Retrieve existing attachments */
    const projectData = await projectResourcesModel.findOne({
      organization_id,
      project_id,
    });
    if (!projectData) {
      logger.warn(`⚠️ Project not found for ID: ${project_id}`);
      return res
        .status(404)
        .json({ success: false, message: "Project not found", status: 404 });
    }

    /** 🔄 Filter out attachment */
    const updatedAttachments = projectData[resource_type].filter(
      (item) => item.link !== attachment.link
    );
    const update = { [resource_type]: updatedAttachments };
    const options = { new: true };

    /** 🚀 Execute update */
    await projectResourcesModel.findOneAndUpdate(
      { organization_id, project_id },
      update,
      options
    );

    logger.info(
      `✅ Attachment removed successfully from project ID: ${project_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Project resource deleted",
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error removing attachment from project ID ${req.body.project_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Project Resource
 * Updates project resource details.
 */
projectResourcesController.Update = async (req, res) => {
  try {
    /** 🔍 Check user authorization */
    const userPreference = await userAuthorizationModel.findOne({
      uid: req.body.userAuthorizationId,
    });
    if (
      userPreference &&
      userPreference.project_attachments_create_approved === false
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to add attachments. Please contact your admin",
        status: 403,
      });
    }

    const { organization_id, project_id, ...data } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !project_id) {
      logger.warn("⚠️ Missing required fields for Update");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Updating project resource for ID: ${project_id}`);

    /** 🔄 Prepare update */
    const query = { organization_id, project_id };
    const update = { $set: data };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    /** 🚀 Execute update */
    const updatedProject = await projectResourcesModel.findOneAndUpdate(
      query,
      update,
      options
    );

    logger.info(
      `✅ Project resource updated successfully for ID: ${project_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Project resource updated",
      status: 200,
      data: updatedProject,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating project ID ${req.body.project_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete Project Resource
 * Deletes project resource details.
 */
projectResourcesController.Delete = async (req, res) => {
  try {
    const { project_id, ...data } = req.body;

    /** 🛑 Validate required fields */
    if (!project_id) {
      logger.warn("⚠️ Missing required fields for Delete");
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Deleting project resource for ID: ${project_id}`);

    /** 🚀 Execute deletion */
    const deletedProject = await projectResourcesModel.findOneAndUpdate(
      { project_id },
      { $unset: data }
    );

    logger.info(
      `✅ Project resource deleted successfully for ID: ${project_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Project resource deleted",
      status: 200,
      data: deletedProject,
    });
  } catch (error) {
    logger.error(
      `❌ Error deleting project ID ${req.body.project_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📊 Get Project Resource Data
 * Retrieves project resource data.
 */
projectResourcesController.GetData = async (req, res) => {
  try {
    const { project_id, organization_id } = req.body;

    /** 🛑 Validate required fields */
    if (!project_id || !organization_id) {
      logger.warn("⚠️ Missing required fields for GetData");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Fetching project resource data for ID: ${project_id}`);

    /** 🚀 Fetch project data */
    const projectData = await projectResourcesModel.findOne({
      organization_id,
      project_id,
    });

    logger.info(
      `✅ Project resource data fetched successfully for ID: ${project_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Project resources fetched successfully",
      status: 200,
      data: projectData,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching project ID ${req.body.project_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = projectResourcesController;
