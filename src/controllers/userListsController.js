var ObjectId = require("mongoose").Types.ObjectId;
const userListModel = require("../models/userListsSchema");
const logger = require("../services/logger");

const userListController = {};

/**
 * ➕ Insert User List Entry
 * Inserts a new user list entry into the system with validation and logging.
 */
userListController.Insert = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Missing required request data");
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
        status: 400,
      });
    }

    logger.info("📡 Inserting new user list entry");

    /** 🚀 Create new user list entry */
    const data = new userListModel(req.body);
    await data.save();

    logger.info("✅ User list entry inserted successfully");

    /** ✅ Return success response */
    return res.status(201).json({
      success: true,
      message: "User list entry inserted successfully",
      status: 201,
      data,
    });
  } catch (error) {
    logger.error(`❌ Error inserting user list entry: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while inserting user list entry",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update User List Entry
 * Updates an existing user list entry with validation, error handling, and logging.
 */
userListController.Update = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { id, ...data } = req.body;

    if (!id || Object.keys(data).length === 0) {
      logger.warn("⚠️ Missing required parameters: id or update data");
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        status: 400,
      });
    }

    /** 🔍 Determine correct lookup key */
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { Id: id };

    logger.info(`📡 Updating user list entry for ID: ${id}`);

    /** 🚀 Execute update */
    const updatedData = await userListModel.findOneAndUpdate(
      query,
      { $set: data },
      { new: true }
    );

    /** 🛑 Handle case where user list entry was not found */
    if (!updatedData) {
      logger.warn(`⚠️ No user list entry found for ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "User list entry not found",
        status: 404,
      });
    }

    logger.info(`✅ User list entry updated successfully for ID: ${id}`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "User list entry updated successfully",
      status: 200,
      data: updatedData,
    });
  } catch (error) {
    logger.error(`❌ Error updating user list entry: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating user list entry",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = userListController;
