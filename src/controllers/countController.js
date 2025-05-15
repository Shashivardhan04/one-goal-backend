const countModel = require("../models/leadsSchema");
const logger = require("../services/logger");

const countController = {};

/**
 * 📊 Fetch Lead Counts
 * Retrieves the total count of leads in different stages for a given user.
 */
countController.Count = async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { uid } = req.body;
    if (!uid) {
      logger.warn("⚠️ Missing required parameter: uid");
      return res.status(400).json({
        success: false,
        message: "Missing required parameter: uid",
        status: 400,
      });
    }

    logger.info(`📡 Fetching lead count for UID: ${uid}`);

    /** 🚀 Fetch lead data */
    const result = await countModel.find({ uid }).lean();

    /** ✅ Initialize stage count variables */
    const stageCounts = {
      INTERESTED: 0,
      "NOT INTERESTED": 0,
      CALLBACK: 0,
      WON: 0,
      LOST: 0,
      FRESH: 0,
    };

    /** 🔄 Count leads in different stages */
    result.forEach(({ stage }) => {
      if (stage && stage in stageCounts) {
        stageCounts[stage]++;
      }
    });

    logger.info(`✅ Lead count fetched successfully for UID: ${uid}`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Lead counts fetched successfully",
      status: 200,
      data: stageCounts,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching lead counts for UID ${req.body.uid}: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching lead counts",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = countController;
