var ObjectId = require("mongoose").Types.ObjectId;
const newsModel = require("../models/newsSchema");
const logger = require("../services/logger");

const newsController = {};

/**
 * ➕ Insert News Link
 * Adds a new news link to an organization's records.
 */
newsController.Insert = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, name, link } = req.body;

    if (!organization_id || !name || !link) {
      logger.warn("⚠️ Missing required fields: organization_id, name, or link");
      return res.status(400).json({
        success: false,
        message: "Some fields are missing",
        status: 400,
      });
    }

    logger.info(`📡 Adding news link for Organization ID: ${organization_id}`);

    /** 🔄 Prepare update query */
    const query = { organization_id };
    const newsData = {
      name,
      link,
      created_at: new Date(),
    };

    const update = { $push: { news: newsData } };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    /** 🚀 Execute update */
    const updatedDocument = await newsModel.findOneAndUpdate(
      query,
      update,
      options
    );

    logger.info(
      `✅ News link added successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "News link added successfully",
      status: 200,
      data: updatedDocument,
    });
  } catch (error) {
    logger.error(
      `❌ Error adding news link for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while adding the news link",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update News Data
 * Updates an organization's news records.
 */
newsController.Update = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { organization_id, news } = req.body;

    if (!organization_id || !Array.isArray(news)) {
      logger.warn("⚠️ Missing required fields: organization_id or news array");
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        status: 400,
      });
    }

    logger.info(
      `📡 Updating news data for Organization ID: ${organization_id}`
    );

    /** 🔄 Prepare update query */
    const query = { organization_id };
    const update = { news };

    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    /** 🚀 Execute update */
    const updatedNewsData = await newsModel.findOneAndUpdate(
      query,
      update,
      options
    );

    logger.info(
      `✅ News updated successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "News updated successfully",
      status: 200,
      data: updatedNewsData,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating news for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating news",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📌 Fetch All News
 * Retrieves all stored news articles for a specific organization.
 */
newsController.FetchAll = async (req, res) => {
  try {
    /** 🛑 Validate request query */
    const { organization_id } = req.query;

    if (!organization_id) {
      logger.warn("⚠️ Missing required parameter: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching all news for Organization ID: ${organization_id}`);

    /** 🔍 Fetch news articles */
    const data = await newsModel.findOne({ organization_id }).lean();

    /** 🛑 Handle case where no news exists */
    if (!data) {
      logger.warn(`⚠️ No news found for Organization ID: ${organization_id}`);
      return res.status(404).json({
        success: false,
        message: "No news found for the specified organization",
        status: 404,
      });
    }

    logger.info(
      `✅ News fetched successfully for Organization ID: ${organization_id}`
    );

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Fetched all news successfully",
      status: 200,
      data,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching news for Organization ID ${req.query.organization_id}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching news",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = newsController;
