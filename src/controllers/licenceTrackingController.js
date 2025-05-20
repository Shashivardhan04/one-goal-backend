var ObjectId = require("mongoose").Types.ObjectId;
const licenceTrackingModel = require("../models/licenceTrackingSchema");
const logger = require("../services/logger");
const licenceTrackingController = {};

/**
 * 🔍 Get Licence Tracking Data
 * Fetches and aggregates licence tracking information by date.
 */
licenceTrackingController.Get = async (req, res) => {
  try {
    /** 🚀 Retrieve all licence tracking data */
    const data = await licenceTrackingModel.find({}).lean();

    /** 🔄 Extract and aggregate data */
    const aggregatedData = data.reduce((acc, obj) => {
      obj.data.forEach((entry) => {
        acc[entry.date] = (acc[entry.date] || 0) + Number(entry.count);
      });
      return acc;
    }, {});

    logger.info(`✅ Licence tracking data retrieved successfully`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Data retrieved successfully",
        status: 200,
        data: [aggregatedData],
      });
  } catch (error) {
    logger.error(`❌ Error fetching licence tracking data: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔍 Get Organisation Licence Tracking Data
 * Retrieves and aggregates licence tracking details for a specific organization.
 */
licenceTrackingController.Getorg = async (req, res) => {
  try {
    const { organization_id } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn(
        "⚠️ Missing required organization ID for fetching licence tracking data"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID is required",
          status: 400,
        });
    }

    logger.info(
      `📡 Fetching licence tracking data for Organization ID: ${organization_id}`
    );

    /** 🚀 Retrieve data */
    const data = await licenceTrackingModel.find({ organization_id }).lean();

    /** 🛑 Handle case where no data is found */
    if (!data || data.length === 0) {
      logger.warn(
        `⚠️ No licence tracking data found for Organization ID: ${organization_id}`
      );
      return res
        .status(404)
        .json({
          success: false,
          message: "No licence tracking data found",
          status: 404,
        });
    }

    /** 🔄 Aggregate tracking data */
    let totalCount = 0;
    const aggregatedData = data.map((obj) => {
      obj.data.forEach((entry) => {
        totalCount += Number(entry.count);
      });
      return {
        organization_id: obj.organization_id,
        data: obj.data,
        Total: totalCount,
      };
    });

    logger.info(
      `✅ Licence tracking data retrieved successfully for Organization ID: ${organization_id}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Data retrieved successfully",
        status: 200,
        data: aggregatedData,
      });
  } catch (error) {
    logger.error(
      `❌ Error fetching licence tracking data for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔄 Update Licence Tracking Data
 * Updates the licence tracking information for a specific organization.
 */
licenceTrackingController.Update = async (req, res) => {
  try {
    const { organization_id, data } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !data || !data[0]?.count) {
      logger.warn(
        "⚠️ Missing required fields for updating licence tracking data"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Required fields are missing",
          status: 400,
        });
    }

    logger.info(
      `📡 Updating licence tracking data for Organization ID: ${organization_id}`
    );

    /** 🔄 Prepare update query */
    const query = { organization_id };
    const update = {
      $push: { data: { count: data[0].count, date: new Date() } },
    };
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };

    /** 🚀 Execute update */
    const updatedDocument = await licenceTrackingModel.findOneAndUpdate(
      query,
      update,
      options
    );

    logger.info(
      `✅ Licence tracking data updated successfully for Organization ID: ${organization_id}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Data updated successfully",
        status: 200,
        data: updatedDocument,
      });
  } catch (error) {
    logger.error(
      `❌ Error updating licence tracking data for Organization ID ${req.body.organization_id}: ${error.message}`
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = licenceTrackingController;
