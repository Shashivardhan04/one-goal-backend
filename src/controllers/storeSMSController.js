const storeSMSModel = require("../models/storeSMSSchema.js");
const logger = require("../services/logger");
const storeSMSController = {};

/**
 * 📩 Store SMS
 * Validates input data and stores SMS records securely.
 */
storeSMSController.storeSMS = async (req, res) => {
  try {
    const { uid, organization_id, mobile_number, sms_data } = req.body;

    /** 🛑 Validate required fields */
    if (!mobile_number) {
      logger.warn("⚠️ Missing mobile number field");
      return res.status(400).json({
        success: false,
        message: "Mobile number field cannot be empty",
        status: 400,
      });
    }
    if (!uid) {
      logger.warn("⚠️ Missing UID field");
      return res.status(400).json({
        success: false,
        message: "UID field cannot be empty",
        status: 400,
      });
    }
    if (!organization_id) {
      logger.warn("⚠️ Missing Organization ID field");
      return res.status(400).json({
        success: false,
        message: "Organization field cannot be empty",
        status: 400,
      });
    }
    if (!sms_data) {
      logger.warn("⚠️ Missing SMS data field");
      return res.status(400).json({
        success: false,
        message: "Please enter SMS data",
        status: 400,
      });
    }

    logger.info(`📡 Storing SMS for UID: ${uid}`);

    /** 🚀 Create and store SMS record */
    const storeMongoSms = new storeSMSModel({
      uid,
      organization_id,
      mobile_number,
      sms_data,
    });
    await storeMongoSms.save();

    logger.info(`✅ SMS stored successfully for UID: ${uid}`);
    return res.status(201).json({
      success: true,
      message: "Data updated successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error storing SMS data: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while storing SMS data",
      status: 500,
      error: error.message,
    });
  }
};
module.exports = storeSMSController;
