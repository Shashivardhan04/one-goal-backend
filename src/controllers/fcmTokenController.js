var ObjectId = require("mongoose").Types.ObjectId;
const fcmModel = require("../models/fcmTokenSchema");
const logger = require("../services/logger");

const fcmController = {};

/**
 * ➕ Insert FCM Token
 * Registers a new FCM token in the system with validation, error handling, and logging.
 */
fcmController.Insert = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Invalid request: Empty FCM token payload");
      return res.status(400).json({
        success: false,
        message: "FCM token data is required",
        status: 400,
      });
    }

    /** 📌 Save FCM token */
    const data = new fcmModel(req.body);
    await data.save();

    logger.info("✅ FCM token inserted successfully");

    /** ✅ Return success response */
    return res.status(201).json({
      success: true,
      message: "FCM token inserted successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error inserting FCM token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while inserting FCM token",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update FCM Token
 * Updates an existing FCM token with new details, ensuring validation, error handling, and logging.
 */
fcmController.Update = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Invalid request: Empty FCM token payload");
      return res.status(400).json({
        success: false,
        message: "FCM token data is required",
        status: 400,
      });
    }

    const data = { ...req.body };
    const id = data.id;
    delete data.id;

    /** 🛑 Validate ID */
    if (!id) {
      logger.warn("⚠️ Missing required parameter: id");
      return res.status(400).json({
        success: false,
        message: "FCM token ID is required",
        status: 400,
      });
    }

    /** 🔍 Determine correct lookup key */
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { Id: id };

    logger.info(`🔄 Updating FCM Token for ID: ${id}`);

    /** 🔄 Update token */
    const result = await fcmModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true }
    );

    /** ✅ Check if update was successful */
    if (!result) {
      logger.warn(`⚠️ No FCM token found for ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "FCM token not found",
        status: 404,
      });
    }

    logger.info(`✅ FCM Token updated successfully for ID: ${id}`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "FCM token updated successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating FCM token for ID ${req.body.id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the FCM token",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = fcmController;
