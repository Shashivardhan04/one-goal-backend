const axios = require("axios");
const smsModel = require("../models/smsModel");
const logger = require("../services/logger");

const smsController = {};

/**
 * ➕ Add SMS Service Data
 * Stores SMS service details for an organization.
 */
smsController.addSmsServiceData = async (req, res) => {
  try {
    /** 🔍 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Missing request body for SMS service data");
      return res.status(400).json({
        success: false,
        message: "Request body is required",
        status: 400,
      });
    }

    logger.info("📡 Saving organization SMS service data");

    /** 🚀 Create and save SMS service data */
    const newSms = new smsModel(req.body);
    await newSms.save();

    logger.info("✅ SMS service data saved successfully");
    return res.status(201).json({
      success: true,
      message: "Organization SMS service data saved",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error saving SMS service data: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📤 Trigger SMS
 * Sends an SMS based on request data with structured validation and error handling.
 */
smsController.triggerSMS = async (req, res) => {
  try {
    const { organization_id, phone } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !phone) {
      logger.warn("⚠️ Missing required fields for SMS trigger");
      return res.status(400).json({
        success: false,
        message: "Organization ID and phone number are required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching SMS service for Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch SMS service */
    const sms = await smsModel.findOne({ organization_id });

    /** 🛑 Handle missing SMS service */
    if (!sms) {
      logger.warn(
        `⚠️ No SMS service found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "No SMS service found for this organization",
        status: 404,
      });
    }

    /** 🔄 Send SMS */
    await sendNotification(sms.sms, phone, "SMS");
    await sendNotification(sms.whatsApp, phone, "WhatsApp");

    logger.info(
      `✅ Message sent successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Message sent successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error triggering SMS: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Generic function to send notifications (SMS/WhatsApp).
 * Handles request formatting, URL replacements, and API calls.
 */
const sendNotification = async (service, phone, type) => {
  try {
    if (!service?.url) {
      logger.warn(`⚠️ No valid URL found for ${type} notification`);
      return;
    }

    let { parameters = [], url, url_type, headers, description } = service;

    /** 🛠 Format request parameters */
    const temp = parameters.reduce(
      (acc, p) => ({ ...acc, [p.key]: p.value || "" }),
      {}
    );

    /** 🔄 Replace placeholders safely */
    Object.keys(temp).forEach((key) => {
      temp[key] = temp[key].replace("$phone", phone);
      if (description)
        temp[key] = temp[key].replace("$description", description);
    });

    /** 🚀 Execute API call */
    logger.info(
      `📡 Sending ${type} notification via ${url_type.toUpperCase()} request`
    );

    const response =
      url_type === "post"
        ? headers
          ? await axios.post(url, temp, { headers })
          : await axios.post(url, temp)
        : await axios.get(
            url
              .replace("$phone", phone)
              .replace("$description", description || "")
          );

    logger.info(
      `✅ ${type} message sent successfully, response: ${response.status}`
    );
  } catch (error) {
    logger.error(`❌ Error sending ${type} message: ${error.message}`);
  }
};

/**
 * 🔍 Get Organization SMS Data
 * Fetches stored SMS, WhatsApp, and Email configurations for an organization.
 */
smsController.getOrganizationSms = async (req, res) => {
  try {
    const { organization_id } = req.body;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required organization ID for fetching SMS data");
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching SMS data for Organization ID: ${organization_id}`);

    /** 🚀 Execute query */
    const smsData = await smsModel.findOne({ organization_id }).lean();

    /** 🛑 Handle missing SMS service */
    if (!smsData) {
      logger.warn(
        `⚠️ No SMS service found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "No SMS service found for this organization",
        status: 404,
      });
    }

    logger.info(
      `✅ SMS service data retrieved successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "SMS service data retrieved successfully",
      status: 200,
      data: {
        sms: smsData.sms,
        whatsApp: smsData.whatsApp,
        email: smsData.email,
      },
    });
  } catch (error) {
    logger.error(`❌ Error fetching SMS data: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = smsController;
