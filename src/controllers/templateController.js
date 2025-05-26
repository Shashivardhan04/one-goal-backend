const leadModel = require("../models/leadsSchema");
const admin = require("../../firebaseAdmin.js");
const projectResoucesModel = require("../models/projectResourcesSchema");
const organResourcesModel = require("../models/organizationResourcesSchema");
const userModel = require("../models/userSchema");
const moment = require("moment");
const projectsModel = require("../models/projectsSchema.js");
const logger = require("../services/logger");

const templateController = {};

/**
 * 📝 Create Message Template
 * Generates a message template with dynamic data insertion based on lead, project, and organization details.
 */
templateController.createMessageTemplate = async (req, res) => {
  try {
    const { leadId, project_id, template_id } = req.body;

    /** 🛑 Validate required fields */
    if (!leadId || !template_id) {
      logger.warn("⚠️ Missing required fields for message template creation");
      return res
        .status(400)
        .json({
          success: false,
          message: "Some fields are missing",
          status: 400,
        });
    }

    logger.info(`📡 Creating message template for Lead ID: ${leadId}`);

    /** 📅 Utility function to format date-time */
    const formatDateTime = (dateTimeString) => {
      if (!dateTimeString) return "";
      const date = moment.utc(dateTimeString).utcOffset("+05:30");
      return `${date.format("ll")} at ${date.format("hh:mm A")}`;
    };

    /** 🔍 Fetch lead details */
    const lead = await leadModel.findOne({ Id: leadId }).lean();
    if (!lead) {
      logger.warn(`⚠️ Lead data not found for Lead ID: ${leadId}`);
      return res
        .status(404)
        .json({ success: false, message: "Lead data not found", status: 404 });
    }

    /** 🔍 Fetch project details */
    const project = await projectResoucesModel.findOne({ project_id }).lean();

    /** 🔍 Fetch organization resources */
    const organization = await organResourcesModel.findOne({
      organization_id: lead.organization_id,
      resource_type: "custom_templates",
    });

    if (!organization) {
      logger.warn(
        `⚠️ Organization resources not found for Organization ID: ${lead.organization_id}`
      );
      return res
        .status(404)
        .json({
          success: false,
          message: "Organization resources not found",
          status: 404,
        });
    }

    /** 🔍 Fetch user details */
    const userData = await userModel
      .findOne({ user_email: lead.contact_owner_email })
      .lean();

    /** 🔄 Structure mapping */
    const map = {
      "Customer Name": "customer_name",
      "Project Name": "project_name",
      "Follow Up Time": "next_follow_up_date_time",
      "Project Map Link": "project_map_url",
      "Lead Owner Email": "contact_owner_email",
      "Lead Number": "lead_number",
      "Project Details": "project_description",
      "Lead Owner Name": "user_name",
      "Lead Owner Number": "user_number",
      "Project Address": "address",
    };

    /** 🔎 Find the matching template */
    const template = organization.custom_templates.find(
      (obj) => obj._id == template_id
    );
    if (!template) {
      logger.warn(`⚠️ Template not found for Template ID: ${template_id}`);
      return res
        .status(404)
        .json({ success: false, message: "Template not found", status: 404 });
    }

    /** 🔄 Construct the object with relevant details */
    const obj = {
      ...lead,
      lead_number: lead.contact_no,
      ...project,
      ...(userData && {
        user_name: `${userData.user_first_name} ${userData.user_last_name}`,
        user_number: userData.contact_no,
      }),
      next_follow_up_date_time: formatDateTime(lead.next_follow_up_date_time),
    };

    /** 📝 Replace placeholders in the template */
    const replacedText = template.template_data.replace(
      /\{\{([^}]+)\}\}/g,
      (match, key) => (obj[map[key]] ? obj[map[key]] : "Not Mentioned")
    );

    logger.info(
      `✅ Message template created successfully for Lead ID: ${leadId}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Message template generated",
        status: 200,
        data: replacedText,
      });
  } catch (error) {
    logger.error(`❌ Error creating message template: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create message template",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔍 Fetch Templates
 * Retrieves saved message templates for a given organization.
 */
templateController.fetchTemplates = async (req, res) => {
  try {
    const { organization_id } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn("⚠️ Missing organization ID for fetching templates");
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID is required",
          status: 400,
        });
    }

    logger.info(
      `📡 Fetching templates for Organization ID: ${organization_id}`
    );

    /** 🚀 Fetch organization templates */
    const organizationResourceData = await organResourcesModel.findOne({
      organization_id,
      resource_type: "custom_templates",
    });

    if (!organizationResourceData) {
      logger.warn(
        `⚠️ No templates found for Organization ID: ${organization_id}`
      );
      return res
        .status(404)
        .json({ success: false, message: "No templates found", status: 404 });
    }

    /** 🔄 Extract template fields */
    const modifiedTemplateOptions =
      organizationResourceData.custom_templates.map(
        ({ template_name, _id }) => ({
          label: template_name,
          value: _id,
        })
      );

    logger.info(
      `✅ Templates retrieved successfully for Organization ID: ${organization_id}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Templates retrieved successfully",
        status: 200,
        data: modifiedTemplateOptions,
      });
  } catch (error) {
    logger.error(`❌ Error fetching templates: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch templates",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = templateController;
