const automatedScoreModel= require("../models/automatedScoreSchema");
const taskModel= require("../models/taskSchema");
const callLogsModel=require("../models/callLogsSchema");
const leadsModel=require("../models/leadsSchema");
const moment = require('moment');

const automatedScoreController={};


automatedScoreController.createWeights= async (req, res) => {
    try {
      const { organization_id, weights } = req.body;

      if (!weights || !organization_id || Object.keys(weights).length === 0) {
        return res.status(400).json({
          success: false,
          error: "Some fields are missing",
        });
      }

      let result;

      const existingScore = await automatedScoreModel.findOne({
        organization_id: organization_id,
      });

      const update = {
        $set: weights,
      };

      const options = {
        new: true,
      };

      if (existingScore) {
        result = await automatedScoreModel.findOneAndUpdate(
          { organization_id: organization_id },
          update,
          options
        );
      } else {
        const newObj = {
          organization_id: organization_id,
          weights: weights,
        };

        result = await automatedScoreModel.create(newObj);
      }

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  },

automatedScoreController.calculation = async (req, res) => {
    try {
      const organization_id = req.body.organization_id || "";
      const uid = req.body.uid || "";

      if (!organization_id || !uid) {
        return res.status(400).json({
          success: false,
          error: "Some fields are missing",
        });
      }

      const startOfMonth = moment().startOf("month").toDate();
      let startDate = startOfMonth;
      let endDate = moment().toDate();

      const leadAssignedQuery = {
        organization_id: organization_id,
        uid: uid,
        lead_assign_time: {
          $gte: moment(startDate).utcOffset("+05:30").toDate(),
          $lte: moment(endDate).utcOffset("+05:30").toDate(),
        },
      };

      const leadsAssignedAtInterval = await leadsModel
        .find(leadAssignedQuery)
        .select("Id -_id");

      const leadIdcount = leadsAssignedAtInterval.map((val) => {
        return val.Id;
      });

      const leadsAssignedTotal = await leadsModel.countDocuments(
        leadAssignedQuery
      );

      const callsQuery = [
        {
          $match: {
            organization_id: organization_id,
            uid: uid,
            created_at: {
              $gte: moment(startDate).utcOffset("+05:30").toDate(),
              $lte: moment(endDate).utcOffset("+05:30").toDate(),
            },
            leadId: { $in: leadIdcount }, // Filter by the specific leadIds
          },
        },
        {
          $group: {
            _id: "$leadId",
            totalCalls: { $sum: 1 },
          },
        },
      ];

      const callsTotal = await callLogsModel.aggregate(callsQuery);

      console.log("dscsdcsd", callsTotal);

      const maxCalls = 1; // Define the maximum count for normalization

      let normalizeCallScore = callsTotal.reduce((sum, val) => {
        let count = val.totalCalls;
        count = Math.min(count, maxCalls); // Limit the count to the maximum value
        return sum + count / maxCalls;
      }, 0);

      // const normalizeCallScore = 1;

      normalizeCallScore = normalizeCallScore / leadsAssignedTotal;

      console.log("qqqqqqqqq", normalizeCallScore);

      /***************************************************************************************** */
      const wonQuery = {
        organization_id: organization_id,
        uid: uid,
        stage: "WON",
        stage_change_at: {
          $gte: moment(startDate).utcOffset("+05:30").toDate(),
          $lte: moment(endDate).utcOffset("+05:30").toDate(),
        },
        Id: { $in: leadIdcount },
      };
      const interestedQuery = {
        organization_id: organization_id,
        uid: uid,
        stage: "INTERESTED",
        stage_change_at: {
          $gte: moment(startDate).utcOffset("+05:30").toDate(),
          $lte: moment(endDate).utcOffset("+05:30").toDate(),
        },
        Id: { $in: leadIdcount },
      };
      const missedQuery = {
        organization_id: organization_id,
        uid: uid,
        status: "Pending",
        due_date: { $lt: moment(endDate).utcOffset("+05:30").toDate() },
        leadId: { $in: leadIdcount },
      };
      const meetingsQuery = {
        organization_id: organization_id,
        uid: uid,
        type: {
          $in: ["Site Visit", "Meeting"],
        },
        status: "Completed",
        completed_at: {
          $gte: moment(startDate).utcOffset("+05:30").toDate(),
          $lte: moment(endDate).utcOffset("+05:30").toDate(),
        },
        leadId: { $in: leadIdcount },
      };
      //calculating the total count of won,interested,missed,meeting/sitevisit in a particular month
      const wonTotal = await leadsModel.countDocuments(wonQuery);
      const interestedTotal = await leadsModel.countDocuments(interestedQuery);
      const missedTotal = await taskModel.countDocuments(missedQuery);
      const meetingsTotal = await taskModel.countDocuments(meetingsQuery);

      let userParams;
      userParams = {
        totalWon: wonTotal,
        totalInterested: interestedTotal,
        totalMissed: missedTotal,
        totalMeetings: meetingsTotal,
      };
      let weights;
      let data = await automatedScoreModel.findOne({
        organization_id: organization_id,
      });

      if (!data) {
        weights = {
          totalWonWeights: 1,
          totalMissedWeights: 1,
          totalMeetingsWeights: 1,
          totalInterestedWeights: 1,
        };
      } else {
        weights = data.weights;

        // converting weights values into number and check wether it contains NaN values or not
        Object.keys(weights).forEach((val) => {
          const numericValue = parseFloat(weights[val]);
          weights[val] = isNaN(numericValue) ? 0 : numericValue;
        });

        weights = Object.fromEntries(weights);

        delete weights.totalCallsWeights;
      }
      console.log("dvfcv", weights);
      console.log("parameters", userParams);
      let totalScore = 0;

      // calculating total score
      totalScore = Object.keys(userParams).reduce((sum, key) => {
        if (userParams[key] && weights[key + "Weights"]) {
          return sum + userParams[key] * weights[key + "Weights"];
        }
        return sum;
      }, 0);
      console.log("total", totalScore);
      totalScore = totalScore < 0 ? 0 : totalScore;

      let maxTotalScore =
        Object.values(weights).reduce((sum, weight) => sum + weight, 0) *
        (leadsAssignedTotal);

      if (maxTotalScore === 0) {
        maxTotalScore = 1;
      }

      console.log("maxTotal", maxTotalScore);

      console.log("lead_assigned", leadsAssignedTotal);
      let aggregateTotalScore;

      aggregateTotalScore =
        (totalScore / maxTotalScore + normalizeCallScore) / 2;

      let rating = Math.round(aggregateTotalScore * 100);

      console.log("rating", rating);

      return res.status(200).json({
        success: true,
        data: { score: rating },
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  };

module.exports = automatedScoreController;