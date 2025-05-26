const Query = require("../models/querySchema");
const logger = require("../services/logger");

const queryController = {};

/**
 * 🔍 Get Queries
 * Retrieves queries for a given user with structured validation and logging.
 */
queryController.getQueries = async (req, res) => {
  try {
    const { user_id } = req.body;

    /** 🛑 Validate required field */
    if (!user_id) {
      logger.warn("⚠️ Missing required user ID for fetching queries");
      return res
        .status(400)
        .json({ success: false, message: "User ID is required", status: 400 });
    }

    logger.info(`📡 Fetching queries for User ID: ${user_id}`);

    /** 🚀 Execute query */
    const queries = await QueryModel.find({ user_id })
      .sort({ created_at: -1 })
      .lean();

    /** 🛑 Handle case where no queries exist */
    if (!queries.length) {
      logger.warn(`⚠️ No queries found for User ID: ${user_id}`);
      return res
        .status(404)
        .json({ success: false, message: "No queries found", status: 404 });
    }

    logger.info(`✅ Queries retrieved successfully for User ID: ${user_id}`);
    return res.status(200).json({
      success: true,
      message: "Queries retrieved successfully",
      status: 200,
      data: queries,
    });
  } catch (error) {
    logger.error(`❌ Error fetching queries: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ➕ Add Query
 * Stores a new query in the database with validation and logging.
 */
queryController.addQuery = async (req, res) => {
  try {
    const {
      mobile_no,
      organization_name,
      customer_name,
      customer_email_id,
      type_of_query,
      attachment,
      description,
      user_id,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !mobile_no ||
      !organization_name ||
      !customer_name ||
      !customer_email_id ||
      !type_of_query ||
      !description ||
      !user_id
    ) {
      logger.warn("⚠️ Missing required fields for query creation");
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
        status: 400,
      });
    }

    logger.info(`📡 Creating new query for User ID: ${user_id}`);

    /** 🚀 Count existing queries to assign ticket number */
    const ticketCount = await QueryModel.countDocuments();

    /** 🔄 Create query object */
    const queryObj = new QueryModel({
      user_id,
      mobile_no,
      organization_name,
      customer_name,
      customer_email_id,
      type_of_query,
      attachment: attachment || "", // Ensure optional attachments don’t break processing
      description,
      ticket_no: ticketCount + 1, // Assign sequential ticket number
    });

    /** 💾 Save query */
    const savedQuery = await queryObj.save();

    logger.info(`✅ Query created successfully for User ID: ${user_id}`);
    return res.status(201).json({
      success: true,
      message: "Query created successfully",
      status: 201,
      data: savedQuery,
    });
  } catch (error) {
    logger.error(`❌ Error creating query: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = queryController;
