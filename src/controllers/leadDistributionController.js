const leadDistributionModel = require("../models/leadDistributionSchema");
const userModel = require("../models/userSchema");
const logger = require("../services/logger");
const { MESSAGES } = require("../constants/constants");

const leadDistributionController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time",
];

/**
 * 🔄 Create Lead Distribution Logic
 * Validates input data and ensures structured processing of lead distribution logic.
 */
leadDistributionController.create = async (req, res) => {
  try {
    const {
      organization_id,
      budget,
      location,
      project,
      property_type,
      source,
      users,
      api_forms,
      autoRotationalEnable,
      autoRotationTime,
      returnLeadTo,
      requirement_type,
    } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id is required",
        status: 400,
      });
    }

    if (!users || users.length === 0) {
      logger.warn("⚠️ No users selected for lead distribution");
      return res.status(400).json({
        success: false,
        message: "Please select at least one user",
        status: 400,
      });
    }

    /** 🔎 Validate at least one selection for other fields */
    const fields = [
      budget,
      location,
      project,
      property_type,
      source,
      api_forms,
      requirement_type,
    ];
    if (
      fields.every(
        (field) => !field || (Array.isArray(field) && field.length === 0)
      )
    ) {
      logger.warn(
        "⚠️ No selection made for budget, location, project, property_type, or source"
      );
      return res.status(400).json({
        success: false,
        message:
          "Please select at least one option for budget, location, project, property_type, or source",
        status: 400,
      });
    }

    /** ⏳ Check minimum auto-rotation time */
    if (autoRotationTime && autoRotationTime < 10) {
      logger.warn("⚠️ Invalid auto rotation time");
      return res.status(400).json({
        success: false,
        message: "Auto rotation time should be 10 minutes or greater",
        status: 400,
      });
    }

    /** 🚀 Construct lead distribution object */
    const obj = {
      organization_id,
      budget,
      location,
      project,
      property_type,
      source,
      users,
      requirement_type,
      api_forms,
      autoRotationEnabled: autoRotationalEnable || "OFF",
      autoRotationTime: autoRotationTime || 0,
      returnLeadTo: returnLeadTo || "",
    };

    /** 💾 Create lead distribution entry */
    await leadDistributionModel.create(obj);

    logger.info(
      `✅ Lead distribution created successfully for Organization ID: ${organization_id}`
    );
    return res.status(201).json({
      success: true,
      message: "Lead distribution created successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error creating lead distribution: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to create lead distribution",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 🔄 Update Lead Distribution Logic
 * Validates input data and ensures structured processing of lead distribution updates.
 */
leadDistributionController.update = async (req, res) => {
  try {
    const { Id, autoRotationTime, ...data } = req.body;

    /** 🛑 Validate required field */
    if (!Id) {
      logger.warn("⚠️ Missing required field: Id");
      return res
        .status(400)
        .json({ success: false, message: "Id is required", status: 400 });
    }

    /** 🔎 Check if the lead distribution exists */
    const check = await leadDistributionModel.findById(Id);
    if (!check) {
      logger.warn(`⚠️ Lead distribution logic does not exist for ID: ${Id}`);
      return res.status(404).json({
        success: false,
        message: "Distribution logic doesn't exist",
        status: 404,
      });
    }

    /** ⏳ Validate autoRotationTime */
    if (autoRotationTime && autoRotationTime < 10) {
      logger.warn("⚠️ Invalid auto rotation time");
      return res.status(400).json({
        success: false,
        message: "Auto rotation time should be 10 minutes or greater",
        status: 400,
      });
    }

    /** 🚀 Clean up data before update */
    delete data.organization_id;
    data.modified_at = new Date();

    if (Object.keys(data).length === 0) {
      logger.warn("⚠️ No update parameters provided");
      return res.status(400).json({
        success: false,
        message: "Please send at least one parameter to update",
        status: 400,
      });
    }

    /** 💾 Perform update */
    await leadDistributionModel.findOneAndUpdate(
      { _id: Id },
      { $set: data },
      { new: true }
    );

    logger.info(
      `✅ Lead distribution logic updated successfully for ID: ${Id}`
    );
    return res.status(200).json({
      success: true,
      message: "Logic updated successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error updating lead distribution logic: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to update lead distribution logic",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * ❌ Delete Lead Distribution Logic
 * Deletes a lead distribution entry by ID with proper validation and error handling.
 */
leadDistributionController.deleteLogic = async (req, res) => {
  try {
    const { Id } = req.body;

    /** 🛑 Validate required field */
    if (!Id) {
      logger.warn("⚠️ Missing required field: Id");
      return res
        .status(400)
        .json({ success: false, message: "Id is required", status: 400 });
    }

    logger.info(`📡 Deleting lead distribution logic for ID: ${Id}`);

    /** 🔎 Check if the distribution logic exists */
    const check = await leadDistributionModel.findById(Id);
    if (!check) {
      logger.warn(`⚠️ Lead distribution logic not found for ID: ${Id}`);
      return res.status(404).json({
        success: false,
        message: "Distribution logic doesn't exist",
        status: 404,
      });
    }

    /** 🚀 Perform deletion */
    await leadDistributionModel.findByIdAndDelete(Id);

    logger.info(
      `✅ Lead distribution logic deleted successfully for ID: ${Id}`
    );
    return res.status(200).json({
      success: true,
      message: "Logic deleted successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error deleting lead distribution logic: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to delete lead distribution logic",
      status: 500,
      error: error.message,
    });
  }
};

// const emailMapper = async (data) => {
//     const session = await userModel.startSession();

//     try {
//         await session.withTransaction(async () => {

//         });
//     } catch (error) {
//         return res.status(400).json({
//             success: false,
//             message: MESSAGES.catchError,
//             error: error.message,
//         });

//     } finally {
//         // End the session
//         session.endSession();
//     }
// };

/**
 * 📊 Fetch All Lead Distribution Logic
 * Retrieves paginated and filtered lead distribution entries with structured validation.
 */
leadDistributionController.fetchAll = async (req, res) => {
  try {
    const { organization_id, page, limit, sort, filters } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id is required",
        status: 400,
      });
    }

    /** 🔄 Parse filters */
    let parsedFilters = {};
    try {
      if (filters) {
        parsedFilters = JSON.parse(filters);

        for (const key of Object.keys(parsedFilters)) {
          if (
            datesField.includes(key) &&
            Array.isArray(parsedFilters[key]) &&
            parsedFilters[key].length === 2
          ) {
            parsedFilters[key] = {
              $gte: new Date(parsedFilters[key][0]),
              $lte: new Date(parsedFilters[key][1]),
            };
          } else if (["users", "returnLeadTo"].includes(key)) {
            const result = await userModel.find(
              { user_email: { $in: parsedFilters[key] } },
              { uid: 1, _id: 0 }
            );
            parsedFilters[key] = { $all: result.map((val) => val.uid) };
          } else {
            parsedFilters[key] = { $all: parsedFilters[key] };
          }
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Invalid filter parameter`);
      return res.status(400).json({
        success: false,
        message: "Invalid parameter",
        status: 400,
        error: error.message,
      });
    }

    /** 🔢 Convert pagination values */
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid page or limit value",
        status: 400,
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    /** 🔄 Parse sorting */
    let parsedSort = {};
    if (sort) {
      try {
        parsedSort = JSON.parse(sort);
      } catch (error) {
        logger.warn(`⚠️ Invalid sort parameter`);
        return res.status(400).json({
          success: false,
          message: "Invalid sort parameter",
          status: 400,
          error: error.message,
        });
      }
    }

    /** 🚀 Fetch count of all records */
    const count = await leadDistributionModel.countDocuments({
      organization_id,
      ...parsedFilters,
    });

    /** 🔎 Retrieve filtered and paginated data */
    const data = await leadDistributionModel
      .find({ organization_id, ...parsedFilters }, { __v: 0 })
      .lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);

    /** 🔄 Map user emails */
    const uniqueUserIds = [
      ...new Set(
        data.flatMap(({ users, returnLeadTo }) =>
          [...users, returnLeadTo].filter(Boolean)
        )
      ),
    ];
    const modifiedData = await userModel.find(
      { uid: { $in: uniqueUserIds } },
      { user_email: 1, uid: 1, _id: 0 }
    );

    const userMapping = Object.fromEntries(
      modifiedData.map(({ uid, user_email }) => [uid, user_email])
    );

    data.forEach((entry) => {
      entry.usersWithUid = entry.users.map((uid) => ({
        uid,
        user_email: userMapping[uid],
      }));
      entry.users = entry.users.map((uid) => userMapping[uid]);
      entry.returnLeadTo = userMapping[entry.returnLeadTo] || "";
    });

    logger.info(`✅ Successfully fetched all lead distribution logic`);
    return res.status(200).json({
      success: true,
      message: "Fetched all distribution logic",
      status: 200,
      data,
      count,
    });
  } catch (error) {
    logger.error(`❌ Error fetching lead distribution logic: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch lead distribution logic",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 📊 Fetch Filter Values
 * Retrieves distinct values for filtering lead distributions.
 */
leadDistributionController.filterValues = async (req, res) => {
  try {
    const { organization_id } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "organization_id is required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching filter values for Organization ID: ${organization_id}`
    );

    /** 🔄 Define aggregation stages */
    const groupStage = {
      $group: {
        _id: null,
        budget: { $addToSet: "$budget" },
        location: { $addToSet: "$location" },
        project: { $addToSet: "$project" },
        property_type: { $addToSet: "$property_type" },
        source: { $addToSet: "$source" },
        users: { $addToSet: "$users" },
        api_forms: { $addToSet: "$api_forms" },
        autoRotationEnabled: { $addToSet: "$autoRotationEnabled" },
        autoRotationTime: { $addToSet: "$autoRotationTime" },
        returnLeadTo: { $addToSet: "$returnLeadTo" },
        requirement_type: { $addToSet: "$requirement_type" },
      },
    };

    const projectStage = {
      $project: {
        _id: 0,
        budget: {
          $reduce: {
            input: "$budget",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        location: {
          $reduce: {
            input: "$location",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        project: {
          $reduce: {
            input: "$project",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        property_type: {
          $reduce: {
            input: "$property_type",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        requirement_type: {
          $reduce: {
            input: "$requirement_type",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        source: {
          $reduce: {
            input: "$source",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        users: {
          $reduce: {
            input: "$users",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        api_forms: {
          $reduce: {
            input: "$api_forms",
            initialValue: [],
            in: { $setUnion: ["$$value", "$$this"] },
          },
        },
        autoRotationEnabled: 1,
        autoRotationTime: 1,
        returnLeadTo: 1,
      },
    };

    /** 🚀 Execute aggregation */
    const filterValues = await leadDistributionModel.aggregate([
      { $match: { organization_id } },
      groupStage,
      projectStage,
    ]);

    /** 🔎 Map user emails */
    const uniqueUserIds = [
      ...filterValues[0].users,
      ...filterValues[0].returnLeadTo,
    ].filter(Boolean);
    const modification = await userModel.find(
      { uid: { $in: uniqueUserIds } },
      { uid: 1, user_email: 1, _id: 0 }
    );

    const userMapping = Object.fromEntries(
      modification.map(({ uid, user_email }) => [uid, user_email])
    );

    filterValues[0].users = filterValues[0].users.map(
      (uid) => userMapping[uid]
    );
    filterValues[0].returnLeadTo = filterValues[0].returnLeadTo.map(
      (uid) => userMapping[uid]
    );

    logger.info(`✅ Successfully fetched filter values`);
    return res.status(200).json({
      success: true,
      message: "Fetched all filter values",
      status: 200,
      data: filterValues,
    });
  } catch (error) {
    logger.error(`❌ Error fetching filter values: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch filter values",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 📊 Lead Distribution Count
 * Retrieves the total count of lead distribution entries based on provided filters.
 */
leadDistributionController.leadDistributionCount = async (req, res) => {
  try {
    const { organization_id, filters } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res
        .status(400)
        .json({
          success: false,
          message: "organization_id is required",
          status: 400,
        });
    }

    logger.info(
      `📡 Counting lead distributions for Organization ID: ${organization_id}`
    );

    /** 🔄 Parse filters */
    let parsedFilters = {};
    try {
      if (filters) {
        parsedFilters = JSON.parse(filters);

        for (const key of Object.keys(parsedFilters)) {
          if (
            datesField.includes(key) &&
            Array.isArray(parsedFilters[key]) &&
            parsedFilters[key].length === 2
          ) {
            parsedFilters[key] = {
              $gte: new Date(parsedFilters[key][0]),
              $lte: new Date(parsedFilters[key][1]),
            };
          } else if (key === "users") {
            const result = await userModel.find(
              { user_email: { $in: parsedFilters[key] } },
              { uid: 1, _id: 0 }
            );
            parsedFilters[key] = { $all: result.map((val) => val.uid) };
          } else {
            parsedFilters[key] = { $all: parsedFilters[key] };
          }
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Invalid filter parameter`);
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid parameter",
          status: 400,
          error: error.message,
        });
    }

    /** 🚀 Retrieve count of filtered lead distribution records */
    const count = await leadDistributionModel.countDocuments({
      organization_id,
      ...parsedFilters,
    });

    logger.info(`✅ Successfully counted ${count} lead distribution records`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Fetched all records",
        status: 200,
        data: count,
      });
  } catch (error) {
    logger.error(
      `❌ Error counting lead distribution records: ${error.message}`
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to retrieve lead distribution count",
        status: 500,
        error: error.message,
      });
  }
};

module.exports = leadDistributionController;
