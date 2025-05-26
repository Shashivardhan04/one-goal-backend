var ObjectId = require("mongoose").Types.ObjectId;
const apiQuestionsModel = require("../models/apiQuestionsSchema.js");
const logger = require("../services/logger");

const apiQuestionsController = {};

/**
 * ➕ Add API Question
 * Stores a new API-related question in the database with structured validation and logging.
 */
apiQuestionsController.addApiQuestions = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    if (!req.body || Object.keys(req.body).length === 0) {
      logger.warn("⚠️ Missing request body for API question insertion");
      return res
        .status(400)
        .json({
          success: false,
          message: "Request body is required",
          status: 400,
        });
    }

    logger.info("📡 Adding new API question");

    /** 🚀 Create and save API question */
    const newQuestion = new apiQuestionsModel(req.body);
    await newQuestion.save();

    logger.info("✅ API question inserted successfully");
    return res
      .status(201)
      .json({
        success: true,
        message: "API question inserted successfully",
        status: 201,
        data: newQuestion,
      });
  } catch (error) {
    logger.error(`❌ Error inserting API question: ${error.message}`);
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
 * 🔍 Get API Questions
 * Retrieves API-related questions based on the provided lead ID.
 */
apiQuestionsController.getApiQuestions = async (req, res) => {
  try {
    const { id } = req.body;

    /** 🛑 Validate required fields */
    if (!id) {
      logger.warn("⚠️ Missing required lead ID for fetching API questions");
      return res
        .status(400)
        .json({ success: false, message: "Lead ID is required", status: 400 });
    }

    logger.info(`📡 Fetching API questions for Lead ID: ${id}`);

    /** 🚀 Execute query */
    const data = await apiQuestionsModel.find({ leadId: id }).lean();

    /** 🛑 Handle case where no questions exist */
    if (!data.length) {
      logger.warn(`⚠️ No API questions found for Lead ID: ${id}`);
      return res
        .status(404)
        .json({
          success: false,
          message: "No API questions found",
          status: 404,
        });
    }

    logger.info(`✅ API questions retrieved successfully for Lead ID: ${id}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "API questions retrieved successfully",
        status: 200,
        data,
      });
  } catch (error) {
    logger.error(`❌ Error fetching API questions: ${error.message}`);
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

module.exports = apiQuestionsController;
