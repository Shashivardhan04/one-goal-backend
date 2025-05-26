const lastDialedCallLogModel = require("../models/lastDialedCallLogSchema");
const leadModel = require("../models/leadsSchema");
const logger = require("../services/logger");

const lastDialedCallLogController = {};

/**
 * 📞 Create Last Dialed Call Log
 * Stores last dialed call log entries with structured validation and logging.
 */
lastDialedCallLogController.create = async (req, res) => {
  try {
    const { leadId, contact_no, uid, contact_owner_email, organization_id } =
      req.body;

    /** 🛑 Validate required fields */
    if (
      !leadId ||
      !contact_no ||
      !uid ||
      !contact_owner_email ||
      !organization_id
    ) {
      logger.warn("⚠️ Missing required fields for call log creation");
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        status: 400,
      });
    }

    logger.info(
      `📡 Creating last dialed call log for UID: ${uid}, Lead ID: ${leadId}`
    );

    /** 🔍 Check if an existing call log entry exists */
    const existingLog = await lastDialedCallLogModel.findOne({ uid });

    /** 🚀 Remove previous entry if exists */
    if (existingLog) {
      await lastDialedCallLogModel.deleteOne({ uid });
    }

    /** 💾 Create new call log entry */
    const newCallLog = await lastDialedCallLogModel.create({
      leadId,
      contact_no,
      uid,
      organization_id,
      contact_owner_email,
    });

    logger.info(`✅ Last dialed call log created successfully for UID: ${uid}`);
    return res.status(201).json({
      success: true,
      message: "Call log created successfully",
      status: 201,
      data: newCallLog,
    });
  } catch (error) {
    logger.error(`❌ Error creating call log: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to create call log",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔍 Fetch & Verify Last Dialed Call Log
 * Retrieves and verifies the last call log based on given parameters.
 */
lastDialedCallLogController.fetchAndVerify = async (req, res) => {
  try {
    const { uid } = req.body;

    /** 🛑 Validate required fields */
    if (!uid) {
      logger.warn("⚠️ Missing UID for fetching call log");
      return res
        .status(400)
        .json({ success: false, message: "UID is required", status: 400 });
    }

    logger.info(`📡 Fetching last dialed call log for UID: ${uid}`);

    /** 🔍 Retrieve call log entry */
    const callLog = await lastDialedCallLogModel.findOne({ uid }).lean();
    if (!callLog) {
      logger.warn(`⚠️ No call log found for UID: ${uid}`);
      return res.status(200).json({
        success: true,
        message: "No call log found",
        status: 200,
        data: { isLeadInFresh: false, leadData: {} },
      });
    }

    /** 🔍 Retrieve lead details */
    const lead = await leadModel
      .findOne({ Id: callLog.leadId, transfer_status: false })
      .lean();
    if (!lead) {
      logger.warn(`⚠️ No lead found for Lead ID: ${callLog.leadId}`);
      return res.status(200).json({
        success: true,
        message: "Lead not found",
        status: 200,
        data: { isLeadInFresh: false, leadData: {} },
      });
    }

    /** ✅ Check lead stage */
    const isLeadInFresh = lead.stage.toLowerCase() === "fresh";

    logger.info(`✅ Call log verified successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "Call log verified successfully",
      status: 200,
      data: { isLeadInFresh, leadData: lead },
    });
  } catch (error) {
    logger.error(`❌ Error fetching call log: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch call log",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = lastDialedCallLogController;
