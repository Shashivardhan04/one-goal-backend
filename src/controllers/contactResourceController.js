var ObjectId = require("mongoose").Types.ObjectId;
const contactResourcesModel = require("../models/contactResourcesSchema");
const logger = require("../services/logger");

const contactResourceController = {};

/**
 * ➕ Insert Contact Resource
 * Adds a new contact resource to the database.
 */
contactResourceController.Insert = async (req, res) => {
  try {
    /** 🔍 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Missing request body for contact resource insertion");
      return res.status(400).json({
        success: false,
        message: "Request body is required",
        status: 400,
      });
    }

    logger.info("📡 Inserting new contact resource");

    /** 🚀 Create and save new contact resource */
    const data = new contactResourcesModel(req.body);
    await data.save();

    logger.info("✅ Contact resource inserted successfully");
    return res.status(201).json({
      success: true,
      message: "Contact resource inserted successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error inserting contact resource: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update Contact Resource
 * Modifies an existing contact resource in the database.
 */
contactResourceController.Update = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    if (!req.body || !req.body.id) {
      logger.warn("⚠️ Missing required fields for contact resource update");
      return res.status(400).json({
        success: false,
        message: "Contact ID is required",
        status: 400,
      });
    }

    /** 🛑 Validate ObjectId format */
    const { id, ...updateFields } = req.body;
    const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
    const queryField = isValidObjectId ? { _id: id } : { id: id };

    logger.info(`📡 Updating contact resource with ID: ${id}`);

    /** 🚀 Execute update */
    const updatedResource = await contactResourcesModel.findOneAndUpdate(
      queryField,
      { $set: updateFields },
      { new: true }
    );

    /** 🛑 Handle case where resource is not found */
    if (!updatedResource) {
      logger.warn(`⚠️ Contact resource not found for ID: ${id}`);
      return res.status(404).json({
        success: false,
        message: "Contact resource not found",
        status: 404,
      });
    }

    logger.info(`✅ Contact resource updated successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "Contact resource updated successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error updating contact resource: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = contactResourceController;
