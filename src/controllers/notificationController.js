const Notification = require("../models/notificationModel");
const moment = require("moment");
const { sendNotifications } = require("../functions/sendNotification");
const { MESSAGES } = require("../constants/constants");
const { getTimeDifferenceInSeconds } = require("../constants/constants.js");
const logger = require("../services/logger");

const notificationController = {};

/**
 * ➕ Add Notification
 * Stores a new notification in the database with structured validation and logging.
 */
notificationController.addNewNotification = async (req, res) => {
  try {
    const {
      uid,
      organization_id,
      notification_description,
      notification_title,
      date,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !uid ||
      !organization_id ||
      !notification_description ||
      !notification_title ||
      !date
    ) {
      logger.warn("⚠️ Missing required fields for notification creation");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(
      `📡 Creating new notification for Organization ID: ${organization_id}`
    );

    /** 🚀 Create and save notification */
    const newNotification = await NotificationModel.create({
      uid,
      organization_id,
      notification_description,
      notification_title,
      date,
    });

    logger.info(
      `✅ Notification created successfully for Organization ID: ${organization_id}`
    );
    return res.status(201).json({
      success: true,
      message: "Notification created successfully",
      status: 201,
      data: newNotification,
    });
  } catch (error) {
    logger.error(`❌ Error creating notification: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete Notification
 * Removes an existing notification from the database.
 */
notificationController.deleteNotification = async (req, res) => {
  try {
    const { id } = req.body;

    /** 🛑 Validate required field */
    if (!id) {
      logger.warn("⚠️ Missing required notification ID for deletion");
      return res
        .status(400)
        .json({
          success: false,
          message: "Notification ID is required",
          status: 400,
        });
    }

    /** 🛑 Validate MongoDB ObjectId format */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`⚠️ Invalid ObjectId format: ${id}`);
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid notification ID format",
          status: 400,
        });
    }

    logger.info(`📡 Deleting notification with ID: ${id}`);

    /** 🚀 Execute deletion */
    const deletedNotification = await NotificationModel.findByIdAndDelete(id);

    /** 🛑 Handle case where notification is not found */
    if (!deletedNotification) {
      logger.warn(`⚠️ Notification not found for ID: ${id}`);
      return res
        .status(404)
        .json({
          success: false,
          message: "Notification not found",
          status: 404,
        });
    }

    logger.info(`✅ Notification deleted successfully for ID: ${id}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Notification deleted successfully",
        status: 200,
      });
  } catch (error) {
    logger.error(`❌ Error deleting notification: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred, please try again",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔄 Update Notification
 * Modifies an existing notification entry with structured validation and logging.
 */
notificationController.updateNotifications = async (req, res) => {
  try {
    const { id, leadIds } = req.body;

    /** 🛑 Validate required fields */
    if (!id || !leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      logger.warn(
        "⚠️ Missing or invalid required fields for notification update"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid notification ID and leadIds array are required",
          status: 400,
        });
    }

    /** 🛑 Validate MongoDB ObjectId format */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`⚠️ Invalid ObjectId format: ${id}`);
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid notification ID format",
          status: 400,
        });
    }

    logger.info(`📡 Updating notification with ID: ${id}`);

    /** 🚀 Execute update */
    const notification = await NotificationModel.findByIdAndUpdate(
      id,
      { $addToSet: { leadIds: { $each: leadIds } } },
      { new: true }
    );

    /** 🛑 Handle missing notification */
    if (!notification) {
      logger.warn(`⚠️ Notification not found for ID: ${id}`);
      return res
        .status(404)
        .json({
          success: false,
          message: "Notification not found",
          status: 404,
        });
    }

    logger.info(`✅ Notification updated successfully for ID: ${id}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Notification updated successfully",
        status: 200,
        data: notification,
      });
  } catch (error) {
    logger.error(`❌ Error updating notification: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred, please try again",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔍 Get Notifications
 * Retrieves notifications for a given user, sorted by date.
 */
notificationController.getNotifications = async (req, res) => {
  try {
    const apiStart = new Date();
    const { uid } = req.body;

    /** 🛑 Validate required field */
    if (!uid) {
      logger.warn("⚠️ Missing required UID for fetching notifications");
      return res
        .status(400)
        .json({ success: false, message: "User ID is required", status: 400 });
    }

    logger.info(`📡 Fetching notifications for UID: ${uid}`);

    /** 🚀 Execute query */
    const notifications = await NotificationModel.find({ uid })
      .sort({ date: -1 })
      .lean();

    /** 🛑 Handle case where no notifications exist */
    if (!notifications.length) {
      logger.warn(`⚠️ No notifications found for UID: ${uid}`);
      return res
        .status(404)
        .json({
          success: false,
          message: "No notifications found",
          status: 404,
        });
    }

    /** ⏳ Log query execution time */
    const queryTime = getTimeDifferenceInSeconds(apiStart, new Date());
    logger.info(`⏳ Query execution time: ${queryTime} seconds`);

    logger.info(`✅ Notifications retrieved successfully for UID: ${uid}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Notifications retrieved successfully",
        status: 200,
        data: notifications,
      });
  } catch (error) {
    logger.error(`❌ Error fetching notifications: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred, please try again",
        error: error.message,
        status: 500,
      });
  }
};

////////////////////notification firebase to mongodb ///////////////////////////////////

/**
 * 📢 Send Notification
 * Handles structured error management and logging while sending notifications.
 */
notificationController.sendNotifications = async (req, res) => {
  try {
    const data = req.body;

    /** 🛑 Validate required fields */
    if (!data || Object.keys(data).length === 0) {
      logger.warn("⚠️ Missing request data for sending notifications");
      return res
        .status(400)
        .json({
          success: false,
          message: "Request body is required",
          status: 400,
        });
    }

    logger.info(
      `📡 Sending notifications with payload: ${JSON.stringify(data)}`
    );

    /** 🚀 Execute notification sending */
    await sendNotifications(data);

    logger.info("✅ Notification sent successfully");
    return res
      .status(200)
      .json({
        success: true,
        message: "Notification sent successfully",
        status: 200,
      });
  } catch (error) {
    logger.error(`❌ Error sending notification: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: MESSAGES.catchError || "An error occurred, please try again",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = notificationController;
