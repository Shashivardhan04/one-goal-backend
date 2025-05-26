var ObjectId = require("mongoose").Types.ObjectId;
const auditLogsModel = require("../models/auditLogsSchema.js");
const admin = require("../../firebaseAdmin.js");
const logger = require("../services/logger");

const auditLogsController = {};

/**
 * 📝 Create Export Logs
 * Stores export log entries in the database with structured validation and logging.
 */
auditLogsController.createExportLogs = async (req, res) => {
  try {
    const {
      uid,
      user_email,
      user_first_name,
      user_last_name,
      total_count,
      type,
      organization_id,
      operation_type,
      description,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !uid ||
      !user_email ||
      !user_first_name ||
      !total_count ||
      !type ||
      !organization_id ||
      !operation_type ||
      !description
    ) {
      logger.warn(
        "⚠️ Missing or invalid required fields for export log creation"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "All required fields must be provided",
          status: 400,
        });
    }

    logger.info(`📡 Creating export log for UID: ${uid}`);

    /** 💾 Store new export log entry */
    const newExportLog = new auditLogsModel({
      uid,
      user_email,
      user_first_name,
      user_last_name,
      created_at: Date.now(),
      total_count,
      type,
      organization_id,
      operation_type,
      description,
    });

    await newExportLog.save();

    logger.info(`✅ Export log created successfully for UID: ${uid}`);
    return res
      .status(201)
      .json({ success: true, message: "Export Log Created", status: 201 });
  } catch (error) {
    logger.error(`❌ Error creating export log: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create export log",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔍 Fetch Export Logs
 * Retrieves export logs based on provided organization and operation type.
 */
auditLogsController.fetchExportLogs = async (req, res) => {
  try {
    const { organization_id, operation_type } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn("⚠️ Missing organization ID for fetching export logs");
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID is required",
          status: 400,
        });
    }

    logger.info(
      `📡 Fetching export logs for Organization ID: ${organization_id}`
    );

    /** 🔍 Construct query dynamically */
    const query = { organization_id };
    if (operation_type) query.operation_type = operation_type;

    /** 🚀 Execute query */
    const exportLogs = await auditLogsModel
      .find(query)
      .sort({ created_at: -1 })
      .lean();

    /** 🛑 Handle case where no logs exist */
    if (!exportLogs.length) {
      logger.warn(
        `⚠️ No export logs found for Organization ID: ${organization_id}`
      );
      return res
        .status(404)
        .json({ success: false, message: "No export logs found", status: 404 });
    }

    logger.info(
      `✅ Export logs retrieved successfully for Organization ID: ${organization_id}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Export logs retrieved successfully",
        status: 200,
        data: exportLogs,
      });
  } catch (error) {
    logger.error(`❌ Error fetching export logs: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch export logs",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = auditLogsController;
