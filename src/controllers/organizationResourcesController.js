const organResourcesModel = require("../models/organizationResourcesSchema");
const organizationModel = require("../models/organizationSchema");
const { MESSAGES, ORG_RESOURCE } = require("../constants/constants");
const organizationController = require("./organizationController");
// const errorModel = require('../models/errorsSchema');
var ObjectId = require("mongoose").Types.ObjectId;
const { getTimeDifferenceInSeconds } = require("../constants/constants.js");
const logger = require("../services/logger");

const organResourcesController = {};

/**
 * ➕ Insert Organization Resource
 * Adds a new custom template into an organization's resources.
 */
organResourcesController.Insert = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, custom_template } = req.body;
    if (!organization_id || !custom_template) {
      logger.warn(
        "⚠️ Missing required fields: organization_id or custom_template"
      );
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `🔄 Checking existing custom templates for Organization ID: ${organization_id}`
    );

    /** 🔍 Check if template already exists */
    const query = { organization_id };
    const organizationResources = await organResourcesModel.findOne(query);

    if (organizationResources?.custom_templates) {
      const templateExists = organizationResources.custom_templates.some(
        (item) => item.template_name === custom_template.template_name
      );

      if (templateExists) {
        logger.warn(
          `⚠️ Template with name '${custom_template.template_name}' already exists`
        );
        return res.status(400).json({
          success: false,
          message: "Template with the same name already exists",
          status: 400,
        });
      }
    }

    /** 🔑 Generate unique ID */
    const newId = new mongoose.Types.ObjectId().toString();
    const custom_template_with_id = {
      ...custom_template,
      Id: newId,
    };

    /** 🔄 Update organization resource with new custom template */
    const update = { $push: { custom_templates: custom_template_with_id } };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    logger.info(
      `➕ Inserting new custom template into Organization ID: ${organization_id}`
    );

    const updatedDocument = await organResourcesModel.findOneAndUpdate(
      query,
      update,
      options
    );

    /** ✅ Return success response */
    logger.info(
      `✅ Custom template added successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Custom template added successfully",
      status: 200,
      data: updatedDocument,
    });
  } catch (error) {
    logger.error(`❌ Error inserting custom template: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while inserting the custom template",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📌 Get Organization Resource
 * Retrieves an organization's resource details by its ID.
 */
organResourcesController.Get = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id } = req.body;
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching organization resource for Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch organization resource */
    const query = { organization_id };
    const organizationResources = await organResourcesModel
      .findOne(query)
      .lean();

    /** 🛑 Check if resource exists */
    if (!organizationResources) {
      logger.warn(
        `⚠️ No organization resources found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "Organization resources not found",
        status: 404,
      });
    }

    logger.info(
      `✅ Organization resource fetched successfully for ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Organization resource fetched successfully",
      status: 200,
      data: organizationResources,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching organization resource for ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching organization resource",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Organization Resource
 * Updates an existing custom template within an organization's resources.
 */
organResourcesController.Update = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, custom_template } = req.body;
    if (!organization_id || !custom_template || !custom_template.Id) {
      logger.warn(
        "⚠️ Missing required fields: organization_id or custom_template Id"
      );
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `🔄 Checking existing custom templates for Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch existing organization resource */
    const query = { organization_id };
    const organizationResources = await organResourcesModel.findOne(query);

    /** 🛑 If resource doesn't exist, return an error */
    if (!organizationResources) {
      logger.warn(
        `⚠️ No organization resources found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "Organization resources not found",
        status: 404,
      });
    }

    /** 🔄 Modify the custom template */
    const modified_custom_templates =
      organizationResources.custom_templates.map((item) =>
        item.Id === custom_template.Id ? custom_template : item
      );

    /** 🔄 Update organization resource */
    const update = { custom_templates: modified_custom_templates };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    logger.info(
      `🔄 Updating custom template ID: ${custom_template.Id} for Organization ID: ${organization_id}`
    );

    const updatedDocument = await organResourcesModel.findOneAndUpdate(
      query,
      update,
      options
    );

    /** ✅ Return success response */
    logger.info(
      `✅ Custom template updated successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Custom template updated successfully",
      status: 200,
      data: updatedDocument,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating custom template for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the custom template",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete Organization Resource
 * Removes a custom template from an organization's resources.
 */
organResourcesController.Delete = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, custom_template } = req.body;
    if (!organization_id || !custom_template || !custom_template.Id) {
      logger.warn(
        "⚠️ Missing required fields: organization_id or custom_template Id"
      );
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(
      `🗑️ Deleting custom template ID: ${custom_template.Id} for Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch existing organization resource */
    const query = { organization_id };
    const organizationResources = await organResourcesModel.findOne(query);

    /** 🛑 If resource doesn't exist, return an error */
    if (!organizationResources || !organizationResources.custom_templates) {
      logger.warn(
        `⚠️ No custom templates found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "Organization resources or custom templates not found",
        status: 404,
      });
    }

    /** 🔄 Remove the specified custom template */
    const updatedCustomTemplates =
      organizationResources.custom_templates.filter(
        (item) => item.Id !== custom_template.Id
      );

    /** 🔄 Update organization resource */
    const update = { custom_templates: updatedCustomTemplates };
    const options = { new: true };

    const updatedDocument = await organResourcesModel.findOneAndUpdate(
      query,
      update,
      options
    );

    logger.info(
      `✅ Custom template deleted successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Custom template deleted successfully",
      status: 200,
      data: updatedDocument,
    });
  } catch (error) {
    logger.error(
      `❌ Error deleting custom template for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the custom template",
      error: error.message,
      status: 500,
    });
  }
};

//////////////////////organization resources collection migration from firebase to mongodb /////////////////////////

/**
 * ➕ Create Organization Resource
 * Adds a new resource type to an organization's resources, ensuring validation and duplicate checks.
 */
organResourcesController.createResource = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, resource_type } = req.body;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    if (!ORG_RESOURCE.includes(resource_type)) {
      logger.warn(`⚠️ Invalid resource type: ${resource_type}`);
      return res.status(400).json({
        success: false,
        message: "Invalid resource",
        status: 400,
      });
    }

    logger.info(
      `📡 Creating resource type: ${resource_type} for Organization ID: ${organization_id}`
    );

    /** 🔍 Check if resource already exists */
    const existingResource = await organResourcesModel.findOne({
      organization_id,
      resource_type,
    });

    /** 🛑 Prevent duplicate lead sources */
    if (
      resource_type === "leadSources" &&
      existingResource?.leadSources?.length > 0
    ) {
      const isExists = existingResource.leadSources.some(
        (leadSource) =>
          leadSource.leadSource === req.body.leadSources[0].leadSource
      );

      if (isExists) {
        logger.warn(
          `⚠️ Lead source '${req.body.leadSources[0].leadSource}' already exists`
        );
        return res.status(400).json({
          success: false,
          message: "Lead source exists already",
          status: 400,
        });
      }
    }

    /** 🔄 Update existing resource or create new one */
    if (existingResource) {
      const updateObject = { [resource_type]: req.body[resource_type][0] };
      const result = await organResourcesModel.findByIdAndUpdate(
        existingResource._id,
        { $push: updateObject },
        { new: true }
      );
      logger.info(
        `✅ Resource type '${resource_type}' updated successfully for Organization ID: ${organization_id}`
      );
    } else {
      await organResourcesModel.create(req.body);
      logger.info(
        `✅ New resource type '${resource_type}' created successfully for Organization ID: ${organization_id}`
      );
    }

    /** ✅ Return success response */
    return res.status(201).json({
      success: true,
      message: `${resource_type} created successfully`,
      status: 201,
    });
  } catch (error) {
    logger.error(
      `❌ Error creating resource type '${req.body.resource_type}' for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while creating the resource",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📌 Fetch All Organization Resources
 * Retrieves all resources for a given organization, ensuring validation and structured logging.
 */
organResourcesController.fetchAll = async (req, res) => {
  try {
    const apiStart = Date.now();
    const { organization_id } = req.query;

    /** 🛑 Validate request parameters */
    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching all resources for Organization ID: ${organization_id}`
    );

    /** 🔍 Check if organization exists */
    const check = await organizationModel.findOne(
      { organization_id },
      { organization_id: 1 }
    );

    const query1End = Date.now();
    logger.info(
      `⏳ Query execution time (organization validation): ${
        query1End - apiStart
      }ms`
    );

    /** 🛑 Handle missing organization */
    if (!check) {
      logger.warn(`⚠️ Organization does not exist for ID: ${organization_id}`);
      return res.status(404).json({
        success: false,
        message: "Organization does not exist",
        status: 404,
      });
    }

    /** 🔍 Fetch organization resources */
    const result = await organResourcesModel.find({ organization_id }).lean();

    const query2End = Date.now();
    logger.info(
      `⏳ Query execution time (organization resources retrieval): ${
        query2End - query1End
      }ms`
    );

    /** ✅ Return success response */
    const apiEnd = Date.now();
    logger.info(`⏳ Total API execution time: ${apiEnd - apiStart}ms`);

    return res.status(200).json({
      success: true,
      message: "Organization resources fetched successfully",
      status: 200,
      data: result,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching resources for Organization ID ${req.query.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching organization resources",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Organization Resource
 * Updates an organization's resource, ensuring validation, duplicate checks, and error handling.
 */
organResourcesController.updateOrg = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, resource_type, Id } = req.body;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    if (!ORG_RESOURCE.includes(resource_type)) {
      logger.warn(`⚠️ Invalid resource type: ${resource_type}`);
      return res.status(400).json({
        success: false,
        message: "Invalid resource",
        status: 400,
      });
    }

    logger.info(
      `🔄 Updating resource type: ${resource_type} for Organization ID: ${organization_id}`
    );

    /** 🔍 Prevent duplicate leadSources */
    if (resource_type === "leadSources") {
      const resource = await organResourcesModel.findOne({
        organization_id,
        resource_type,
      });

      if (resource?.leadSources?.length > 0) {
        const isExists = resource.leadSources.some(
          (leadSource) =>
            leadSource.leadSource === req.body.leadSources[0].leadSource
        );

        if (isExists) {
          logger.warn(
            `⚠️ Lead source '${req.body.leadSources[0].leadSource}' already exists`
          );
          return res.status(400).json({
            success: false,
            message: "Lead source exists already",
            status: 400,
          });
        }
      }
    }

    /** 🔄 Handle `permission` resource type differently */
    if (resource_type === "permission") {
      const obj = { [resource_type]: req.body[resource_type] };

      await organResourcesModel.findOneAndUpdate(
        { organization_id, resource_type },
        { $set: obj }
      );

      logger.info(
        `✅ Permission updated successfully for Organization ID: ${organization_id}`
      );
      return res.status(200).json({
        success: true,
        message: `${resource_type} updated successfully`,
        status: 200,
      });
    }

    if (!Id) {
      logger.warn("⚠️ Missing required parameter: Id");
      return res.status(400).json({
        success: false,
        message: "Id required",
        status: 400,
      });
    }

    /** 🔍 Check if resource exists */
    const existingResource = await organResourcesModel.findOne({
      organization_id,
      resource_type,
    });

    if (!existingResource) {
      logger.warn(
        `⚠️ Resource '${resource_type}' does not exist for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: `${resource_type} does not exist`,
        status: 404,
      });
    }

    /** 🔄 Prepare update query */
    const updateQuery = {
      [`${resource_type}._id`]: Id,
      _id: existingResource._id,
    };

    const updateObject = {};
    Object.keys(req.body[resource_type][0]).forEach((val) => {
      updateObject[`${resource_type}.$.${val}`] =
        req.body[resource_type][0][val];
    });

    /** 🔄 Update organization resource */
    await organResourcesModel.updateOne(updateQuery, updateObject);

    logger.info(
      `✅ Resource '${resource_type}' updated successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: `${resource_type} updated successfully`,
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating resource '${req.body.resource_type}' for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the resource",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🗑️ Delete Organization Resource
 * Removes a specific resource from an organization's resource collection.
 */
organResourcesController.deleteResource = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, resource_type, Id } = req.body;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    if (!ORG_RESOURCE.includes(resource_type)) {
      logger.warn(`⚠️ Invalid resource type: ${resource_type}`);
      return res.status(400).json({
        success: false,
        message: "Invalid resource type",
        status: 400,
      });
    }

    /** 🔍 Validate existence of the resource */
    const resourceExists = await organResourcesModel.findOne({
      organization_id,
      resource_type,
    });

    if (!resourceExists) {
      logger.warn(
        `⚠️ Resource '${resource_type}' does not exist for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "Resource does not exist",
        status: 404,
      });
    }

    /** 🔄 Prepare deletion query */
    const updateObj = { [resource_type]: { _id: Id } };

    const deleteRes = await organResourcesModel.findByIdAndUpdate(
      { _id: resourceExists._id },
      { $pull: updateObj },
      { new: true }
    );

    logger.info(
      `✅ Resource '${resource_type}' deleted successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: `${resource_type} deleted successfully`,
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error deleting resource '${req.body.resource_type}' for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting the resource",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = organResourcesController;
