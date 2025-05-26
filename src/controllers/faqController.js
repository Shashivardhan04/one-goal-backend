var ObjectId = require("mongoose").Types.ObjectId;
const faqModel = require("../models/faqSchema");
const logger = require("../services/logger");

const faqController = {};

/**
 * ➕ Create FAQ
 * Adds a new FAQ entry to the database with validation and logging.
 */
faqController.Create = async (req, res) => {
  try {
    const { organization_id, question, answer, created_by, modified_by } =
      req.body;

    /** 🛑 Validate required fields */
    if (
      !organization_id ||
      !question ||
      !answer ||
      !created_by ||
      !modified_by
    ) {
      logger.warn("⚠️ Missing required fields for FAQ creation");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Creating new FAQ for Organization ID: ${organization_id}`);

    /** 🚀 Create and save FAQ */
    const faq = await faqModel.create({
      organization_id,
      question,
      answer,
      created_by,
      modified_by,
    });

    logger.info(
      `✅ FAQ created successfully for Organization ID: ${organization_id}`
    );
    return res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      status: 201,
      data: faq,
    });
  } catch (error) {
    logger.error(`❌ Error creating FAQ: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📊 Fetch All FAQs
 * Retrieves a list of stored FAQs for a given organization.
 */
faqController.FetchAll = async (req, res) => {
  try {
    const { organization_id } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required organization ID for FAQ retrieval");
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching FAQs for Organization ID: ${organization_id}`);

    /** 🚀 Execute query */
    const faqData = await faqModel
      .find({ organization_id }, { __v: 0 })
      .lean()
      .sort({ created_at: -1 });

    /** 🛑 Handle case where no FAQs exist */
    if (!faqData.length) {
      logger.warn(`⚠️ No FAQs found for Organization ID: ${organization_id}`);
      return res
        .status(404)
        .json({ success: false, message: "No FAQs found", status: 404 });
    }

    logger.info(
      `✅ FAQs retrieved successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "FAQs retrieved successfully",
      status: 200,
      data: faqData,
    });
  } catch (error) {
    logger.error(`❌ Error fetching FAQs: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update FAQ
 * Modifies an existing FAQ entry in the database with validation and logging.
 */
faqController.Update = async (req, res) => {
  try {
    const { id, data: updateData } = req.body;

    /** 🛑 Validate required fields */
    if (!id || !updateData) {
      logger.warn("⚠️ Missing required fields for FAQ update");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    /** 🛑 Validate MongoDB ObjectId format */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`⚠️ Invalid ObjectId format: ${id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
        status: 400,
      });
    }

    /** 🔄 Update timestamp */
    updateData.modified_at = new Date();

    logger.info(`📡 Updating FAQ with ID: ${id}`);

    /** 🚀 Execute update */
    const faq = await faqModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );

    /** 🛑 Handle missing FAQ */
    if (!faq) {
      logger.warn(`⚠️ FAQ not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "FAQ not found", status: 404 });
    }

    logger.info(`✅ FAQ updated successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      status: 200,
      data: faq,
    });
  } catch (error) {
    logger.error(`❌ Error updating FAQ: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete FAQ
 * Removes an existing FAQ entry from the database.
 */
faqController.Delete = async (req, res) => {
  try {
    const { id } = req.body;

    /** 🛑 Validate required field */
    if (!id) {
      logger.warn("⚠️ Missing required FAQ ID for deletion");
      return res
        .status(400)
        .json({ success: false, message: "FAQ ID is required", status: 400 });
    }

    /** 🛑 Validate MongoDB ObjectId format */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`⚠️ Invalid ObjectId format: ${id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid FAQ ID format",
        status: 400,
      });
    }

    logger.info(`📡 Deleting FAQ with ID: ${id}`);

    /** 🚀 Execute deletion */
    const deletedFAQ = await faqModel.findByIdAndDelete(id);

    /** 🛑 Handle case where FAQ is not found */
    if (!deletedFAQ) {
      logger.warn(`⚠️ FAQ not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "FAQ not found", status: 404 });
    }

    logger.info(`✅ FAQ deleted successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error deleting FAQ: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};
module.exports = faqController;
