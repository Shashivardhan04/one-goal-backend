var ObjectId = require("mongoose").Types.ObjectId;
const apiTokenModel = require("../models/apiTokenSchema");
const logger = require("../services/logger");
const crypto = require("crypto");

const apiTokenController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time",
];

// apiTokenController.Insert = (req, res) => {
//   const data = new apiTokenModel(req.body);
//   data.save();
//   res.send('api Token inserted');
// };

// apiTokenController.Update = (req, res) => {
//   //const result = await leadModel.find({ id: req.body.id });
//   if (ObjectId.isValid(req.body.id)) {
//     //res.send("true");
//     const data = JSON.parse(JSON.stringify(req.body));
//     const id = data.id;
//     delete data.id;
//     //const updateData=JSON.parse(JSON.stringify(req.body.data))
//     apiTokenModel
//       .findOneAndUpdate({ _id: id }, { $set: data })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send('Updation DONE!');
//         }
//       });
//   } else {
//     const data = JSON.parse(JSON.stringify(req.body));
//     const id = data.id;
//     delete data.id;
//     //const updateData=JSON.parse(JSON.stringify(req.body.data))
//     apiTokenModel
//       .findOneAndUpdate({ id: id }, { $set: data })
//       .exec(function (err, result) {
//         if (err) {
//           console.log(err);
//           res.status(500).send(err);
//         } else {
//           res.status(200).send('Updation DONE!');
//         }
//       });
//   }
// };

const generateToken = (length) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex") // Convert to hexadecimal format
    .slice(0, length); // Trim to desired length
};

/**
 * ➕ Create API Token
 * Adds a new API token to the database with proper validation.
 */
apiTokenController.Create = async (req, res) => {
  try {
    const { organization_id, source, country_code, created_by, modified_by } =
      req.body;

    /** 🛑 Validate required fields */
    if (!organization_id || !source || !created_by || !modified_by) {
      logger.warn("⚠️ Missing required fields for API token creation");
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
        status: 400,
      });
    }

    /** 🔍 Check for duplicate source */
    const apiTokenExists = await apiTokenModel.findOne({
      organization_id,
      source,
    });
    if (apiTokenExists) {
      logger.warn(`⚠️ API token already exists for source: ${source}`);
      return res.status(400).json({
        success: false,
        message: "Source already exists",
        status: 400,
      });
    }

    /** 🛑 Prevent self-generated lead source */
    if (source === "Self Generated") {
      logger.warn("⚠️ Self Generated lead source cannot be created for API");
      return res.status(400).json({
        success: false,
        message: "Self Generated lead source cannot be created for API",
        status: 400,
      });
    }

    /** 🚀 Generate token and save to database */
    const token = generateToken(20);
    const apiToken = await apiTokenModel.create({
      organization_id,
      source,
      country_code,
      created_by,
      modified_by,
      token,
    });

    logger.info(`✅ API token created successfully for source: ${source}`);
    return res.status(201).json({
      success: true,
      message: "API Token created successfully",
      status: 201,
      data: apiToken,
    });
  } catch (error) {
    logger.error(`❌ Error creating API token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 📊 Fetch All API Tokens
 * Retrieves a list of stored API tokens with filtering, pagination, and sorting.
 */
apiTokenController.FetchAll = async (req, res) => {
  try {
    const {
      organization_id,
      page = 1,
      limit = 10,
      sort,
      filters,
      search,
    } = req.query;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn(
        "⚠️ Missing required organization ID for fetching API tokens"
      );
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching API tokens for Organization ID: ${organization_id}`
    );

    /** 🔄 Process filters */
    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
        Object.keys(parsedFilters).forEach((key) => {
          parsedFilters[key] = Array.isArray(parsedFilters[key])
            ? { $in: parsedFilters[key] }
            : parsedFilters[key];
        });
      } catch (error) {
        logger.warn("⚠️ Invalid filters format");
        return res.status(400).json({
          success: false,
          message: "Invalid filters format",
          status: 400,
        });
      }
    }

    /** 🔎 Search functionality */
    if (search) {
      parsedFilters["source"] = { $regex: new RegExp(search, "i") };
    }

    /** 🚀 Pagination setup */
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(limitNumber) ||
      limitNumber < 1
    ) {
      logger.warn("⚠️ Invalid pagination values");
      return res.status(400).json({
        success: false,
        message: "Invalid pagination values",
        status: 400,
      });
    }
    const skip = (pageNumber - 1) * limitNumber;

    /** 🔄 Sorting setup */
    let parsedSort = {};
    if (sort) {
      try {
        parsedSort = JSON.parse(sort);
      } catch (error) {
        logger.warn("⚠️ Invalid sort format");
        return res.status(400).json({
          success: false,
          message: "Invalid sort format",
          status: 400,
        });
      }
    }

    /** 🚀 Execute query */
    const apiTokensData = await apiTokenModel
      .find({ organization_id, ...parsedFilters }, { __v: 0 })
      .lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);

    const apiTokensCount = await apiTokenModel.countDocuments({
      organization_id,
      ...parsedFilters,
    });

    logger.info(
      `✅ API tokens fetched successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "API data retrieved successfully",
      status: 200,
      data: { apiTokensData, apiTokensCount },
    });
  } catch (error) {
    logger.error(`❌ Error fetching API tokens: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔍 Fetch Single API Token
 * Retrieves a specific API token based on the provided token parameter.
 */
apiTokenController.FetchToken = async (req, res) => {
  try {
    const { token } = req.params;

    /** 🛑 Validate required field */
    if (!token) {
      logger.warn("⚠️ Missing required token for API token fetch");
      return res.status(400).json({
        success: false,
        message: "Token parameter is required",
        status: 400,
      });
    }

    logger.info(`📡 Fetching API token for token: ${token}`);

    /** 🚀 Execute query */
    const apiToken = await apiTokenModel.findOne({ token }).lean();

    /** 🛑 Handle case where token is not found */
    if (!apiToken) {
      logger.warn(`⚠️ No API token found for token: ${token}`);
      return res
        .status(404)
        .json({ success: false, message: "API token not found", status: 404 });
    }

    logger.info(`✅ API token retrieved successfully for token: ${token}`);
    return res.status(200).json({
      success: true,
      message: "API token retrieved successfully",
      status: 200,
      data: apiToken,
    });
  } catch (error) {
    logger.error(`❌ Error fetching API token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Update API Token
 * Modifies an existing API token in the database with validation and logging.
 */
apiTokenController.Update = async (req, res) => {
  try {
    const { id, organization_id, data: updateData } = req.body;

    /** 🛑 Validate required fields */
    if (!id || !organization_id || !updateData) {
      logger.warn("⚠️ Missing required fields for API token update");
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
        message: "Invalid token ID format",
        status: 400,
      });
    }

    /** 🛑 Prevent duplicate source entries */
    const apiTokenExists = await apiTokenModel.findOne({
      organization_id,
      source: updateData.source,
    });
    if (apiTokenExists) {
      logger.warn(
        `⚠️ API token already exists for source: ${updateData.source}`
      );
      return res.status(400).json({
        success: false,
        message: "Source already exists",
        status: 400,
      });
    }

    /** 🛑 Prevent "Self Generated" lead source */
    if (updateData.source === "Self Generated") {
      logger.warn("⚠️ Self Generated lead source cannot be created for API");
      return res.status(400).json({
        success: false,
        message: "Self Generated lead source cannot be created for API",
        status: 400,
      });
    }

    /** 🔄 Update timestamp */
    updateData.modified_at = new Date();

    logger.info(`📡 Updating API token with ID: ${id}`);

    /** 🚀 Execute update */
    const apiToken = await apiTokenModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );

    /** 🛑 Handle missing API token */
    if (!apiToken) {
      logger.warn(`⚠️ API token not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "API token not found", status: 404 });
    }

    logger.info(`✅ API token updated successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "API token updated successfully",
      status: 200,
      data: apiToken,
    });
  } catch (error) {
    logger.error(`❌ Error updating API token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ❌ Delete API Token
 * Removes an existing API token from the database.
 */
apiTokenController.Delete = async (req, res) => {
  try {
    const { id } = req.params;

    /** 🛑 Validate required field */
    if (!id) {
      logger.warn("⚠️ Missing required token ID for deletion");
      return res
        .status(400)
        .json({ success: false, message: "Token ID is required", status: 400 });
    }

    /** 🛑 Validate MongoDB ObjectId format */
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.warn(`⚠️ Invalid ObjectId format: ${id}`);
      return res.status(400).json({
        success: false,
        message: "Invalid token ID format",
        status: 400,
      });
    }

    logger.info(`📡 Deleting API token with ID: ${id}`);

    /** 🚀 Execute deletion */
    const deletedToken = await apiTokenModel.findByIdAndDelete(id);

    /** 🛑 Handle case where token is not found */
    if (!deletedToken) {
      logger.warn(`⚠️ API token not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "API token not found", status: 404 });
    }

    logger.info(`✅ API token deleted successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "API token deleted successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error deleting API token: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔎 Filter API Tokens
 * Retrieves distinct values for filtering API tokens based on query parameters.
 */
apiTokenController.FilterValues = async (req, res) => {
  try {
    const { organization_id } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn(
        "⚠️ Missing required organization ID for filtering API tokens"
      );
      return res.status(400).json({
        success: false,
        message: "Organization ID is required",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching filter values for API tokens in Organization ID: ${organization_id}`
    );

    /** 🔄 Define aggregation pipeline */
    const filterValuesForAPITokens = await apiTokenModel.aggregate([
      { $match: { organization_id } },
      {
        $group: {
          _id: null,
          token: { $addToSet: "$token" },
          country_code: { $addToSet: "$country_code" },
          status: { $addToSet: "$status" },
          source: { $addToSet: "$source" },
        },
      },
    ]);

    /** 🛑 Handle case where no data is found */
    if (!filterValuesForAPITokens.length) {
      logger.warn(
        `⚠️ No filter values found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "No filter values found",
        status: 404,
      });
    }

    logger.info(
      `✅ Filter values fetched successfully for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Filter values retrieved successfully",
      status: 200,
      data: filterValuesForAPITokens,
    });
  } catch (error) {
    logger.error(
      `❌ Error fetching filter values for API tokens: ${error.message}`
    );
    return res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
      status: 500,
    });
  }
};

module.exports = apiTokenController;
