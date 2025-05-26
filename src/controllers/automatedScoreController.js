const automatedScoreModel = require("../models/automatedScoreSchema");
const taskModel = require("../models/taskSchema");
const callLogsModel = require("../models/callLogsSchema");
const leadsModel = require("../models/leadsSchema");
const logger = require("../services/logger");
const moment = require("moment");

const automatedScoreController = {};

/**
 * ⚖️ Create Weights
 * Stores weighted parameters for automated scoring logic with structured validation and logging.
 */
automatedScoreController.createWeights = async (req, res) => {
  try {
    const { organization_id, weights } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !weights || Object.keys(weights).length === 0) {
      logger.warn("⚠️ Missing required fields for weight creation");
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID and weight parameters are required",
          status: 400,
        });
    }

    logger.info(
      `📡 Creating weight parameters for Organization ID: ${organization_id}`
    );

    /** 🔍 Check if an existing weight configuration exists */
    const existingScore = await automatedScoreModel.findOne({
      organization_id,
    });

    /** 🚀 Update or create new entry */
    let result;
    if (existingScore) {
      result = await automatedScoreModel.findOneAndUpdate(
        { organization_id },
        { $set: weights },
        { new: true }
      );
      logger.info(
        `✅ Updated weight configuration for Organization ID: ${organization_id}`
      );
    } else {
      result = await automatedScoreModel.create({ organization_id, weights });
      logger.info(
        `✅ Created new weight configuration for Organization ID: ${organization_id}`
      );
    }

    return res
      .status(201)
      .json({
        success: true,
        message: "Weights saved successfully",
        status: 201,
        data: result,
      });
  } catch (error) {
    logger.error(`❌ Error creating weights: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to create weights",
        error: error.message,
        status: 500,
      });
  }
};

/**
 * 🔢 Perform Score Calculation
 * Computes user score based on lead, call, and meeting performance metrics.
 */
automatedScoreController.calculation = async (req, res) => {
  try {
    const { organization_id, uid } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !uid) {
      logger.warn("⚠️ Missing required fields for score calculation");
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID and User ID are required",
          status: 400,
        });
    }

    logger.info(
      `📡 Performing score calculation for UID: ${uid} in Organization ID: ${organization_id}`
    );

    /** 📅 Define start and end date of the month */
    const startDate = moment().startOf("month").toDate();
    const endDate = moment().toDate();

    /** 🔍 Find assigned leads */
    const leadAssignedQuery = {
      organization_id,
      uid,
      lead_assign_time: { $gte: startDate, $lte: endDate },
    };

    const leadsAssigned = await leadsModel
      .find(leadAssignedQuery)
      .select("Id -_id");
    const leadIdList = leadsAssigned.map((val) => val.Id);
    const totalLeadsAssigned = await leadsModel.countDocuments(
      leadAssignedQuery
    );

    /** 🔍 Aggregate call logs */
    const callsTotal = await callLogsModel.aggregate([
      {
        $match: {
          organization_id,
          uid,
          created_at: { $gte: startDate, $lte: endDate },
          leadId: { $in: leadIdList },
        },
      },
      { $group: { _id: "$leadId", totalCalls: { $sum: 1 } } },
    ]);

    /** 🔄 Normalize call score */
    const maxCallsPerLead = 1;
    let normalizedCallScore = callsTotal.reduce(
      (sum, val) =>
        sum + Math.min(val.totalCalls, maxCallsPerLead) / maxCallsPerLead,
      0
    );
    normalizedCallScore /= totalLeadsAssigned || 1; // Avoid division by zero

    /** 🔍 Query lead progress data */
    const queryParams = {
      organization_id,
      uid,
      Id: { $in: leadIdList },
      stage_change_at: { $gte: startDate, $lte: endDate },
    };
    const wonTotal = await leadsModel.countDocuments({
      ...queryParams,
      stage: "WON",
    });
    const interestedTotal = await leadsModel.countDocuments({
      ...queryParams,
      stage: "INTERESTED",
    });

    /** 🔍 Query task data */
    const missedTotal = await taskModel.countDocuments({
      organization_id,
      uid,
      status: "Pending",
      due_date: { $lt: endDate },
      leadId: { $in: leadIdList },
    });
    const meetingsTotal = await taskModel.countDocuments({
      organization_id,
      uid,
      type: { $in: ["Site Visit", "Meeting"] },
      status: "Completed",
      completed_at: { $gte: startDate, $lte: endDate },
      leadId: { $in: leadIdList },
    });

    /** 🔄 Calculate weighted score */
    const userMetrics = {
      totalWon: wonTotal,
      totalInterested: interestedTotal,
      totalMissed: missedTotal,
      totalMeetings: meetingsTotal,
    };
    let weights = await automatedScoreModel.findOne({ organization_id });

    if (!weights) {
      weights = {
        totalWonWeights: 1,
        totalMissedWeights: 1,
        totalMeetingsWeights: 1,
        totalInterestedWeights: 1,
      };
    } else {
      Object.keys(weights.weights).forEach(
        (key) =>
          (weights.weights[key] = isNaN(parseFloat(weights.weights[key]))
            ? 0
            : parseFloat(weights.weights[key]))
      );
    }

    let totalScore = Object.keys(userMetrics).reduce(
      (sum, key) =>
        sum + userMetrics[key] * (weights.weights[key + "Weights"] || 0),
      0
    );
    totalScore = Math.max(totalScore, 0);

    /** 🔢 Compute final rating */
    let maxTotalScore =
      Object.values(weights.weights).reduce((sum, weight) => sum + weight, 0) *
        totalLeadsAssigned || 1;
    let aggregateTotalScore =
      (totalScore / maxTotalScore + normalizedCallScore) / 2;
    let rating = Math.round(aggregateTotalScore * 100);

    logger.info(
      `✅ Score calculation completed successfully for UID: ${uid} - Rating: ${rating}`
    );
    return res
      .status(200)
      .json({
        success: true,
        message: "Score calculated successfully",
        status: 200,
        data: { score: rating },
      });
  } catch (error) {
    logger.error(`❌ Error performing score calculation: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to perform score calculation",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = automatedScoreController;
