var ObjectId = require("mongoose").Types.ObjectId;
const projectsModel = require("../models/projectsSchema");
const crypto = require("crypto");
const userModel = require("../models/userSchema");
const { sanitizationString } = require("../constants/constants.js");
const { getTimeDifferenceInSeconds } = require("../constants/constants.js");
const {
  sendNotificationForNewProject,
} = require("../functions/projectNotification.js");
const logger = require("../services/logger");

const projectsController = {};

const datesField = [
  "created_at",
  "next_follow_up_date_time",
  "stage_change_at",
  "modified_at",
  "lead_assign_time",
  "call_response_time",
];

// apiTokenController.Insert = (req, res) => {
//   const data = new projectsModel(req.body);
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
//     projectsModel
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
//     projectsModel
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
 * ➕ Create a New Project
 * Validates input data and ensures structured project creation.
 */
projectsController.Create = async (req, res) => {
  try {
    const { organization_id, uid, ...projectData } = req.body;
    const project_id = new ObjectId();

    /** 🛑 Validate required fields */
    if (!organization_id || !uid) {
      logger.warn("⚠️ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(`📡 Validating user permissions for UID: ${uid}`);

    /** 🔎 Check user existence */
    const checkUser = await userModel
      .findOne({ organization_id, uid }, { profile: 1 })
      .lean();
    if (!checkUser) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    /** 🔄 Validate user profile */
    if (!["Lead Manager", "Admin"].includes(checkUser.profile)) {
      logger.warn(
        `⚠️ User profile ${checkUser.profile} not allowed to create projects`
      );
      return res.status(403).json({
        success: false,
        message: "Profile is not allowed to create projects",
        status: 403,
      });
    }

    logger.info(
      `🚀 Creating new project for Organization ID: ${organization_id}`
    );

    /** ✏️ Sanitize input fields */
    const sanitizedProjectData = {
      address: sanitizationString(projectData.address) || "",
      developer_name: sanitizationString(projectData.developer_name) || "",
      project_name: sanitizationString(projectData.project_name) || "",
      unit_no: sanitizationString(projectData.unitRef) || "",
      business_vertical: projectData.business_vertical || "",
      organization_id,
      created_by: uid,
      modified_by: uid,
      project_id,
      project_status: projectData.project_status || "",
      property_stage: projectData.property_stage || "",
      property_type: projectData.property_type || "",
      rera_link: projectData.rera_link || "",
      walkthrough_link: projectData.walkthrough_link || "",
      owner_name: projectData.ownerNameRef || "",
      owner_contact_no: projectData.ownerContactRef || "",
      type: projectData.type || "NEW PROJECT",
      price: projectData.priceRef || "",
      description: projectData.description || "",
    };

    /** 💾 Create project entry */
    await projectsModel.create(sanitizedProjectData);

    /** 📩 Send project creation notification */
    const notificationSuccess = await sendNotificationForNewProject(
      organization_id
    );
    if (!notificationSuccess) {
      logger.warn("⚠️ Notification failed while creating listing");
    }

    logger.info(`✅ Project created successfully`);
    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      status: 201,
    });
  } catch (error) {
    logger.error(`❌ Error creating project: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 📂 Fetch All Projects
 * Retrieves all available projects with structured validation, filtering, and logging.
 */
projectsController.FetchAll = async (req, res) => {
  try {
    const { organization_id, page, limit, sort, filters, search } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(`📡 Fetching projects for Organization ID: ${organization_id}`);

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
          } else if (key === "listing_created_by") {
            parsedFilters["created_by"] = { $in: parsedFilters[key] };
          } else {
            parsedFilters[key] = { $in: parsedFilters[key] };
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

    /** 🔎 Apply search query */
    if (search) {
      parsedFilters["project_name"] = { $regex: new RegExp(search, "i") };
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

    /** 🚀 Fetch paginated and sorted projects */
    const projectsData = await projectsModel
      .find({ organization_id, ...parsedFilters }, { __v: 0 })
      .lean()
      .sort(parsedSort)
      .skip(skip)
      .limit(limitNumber);

    /** 🔢 Fetch total count */
    const projectsCount = await projectsModel.countDocuments({
      organization_id,
      ...parsedFilters,
    });

    /** 🔄 Map project creator names */
    const uniqueUserIds = [
      ...new Set(
        projectsData.map(({ created_by }) => created_by).filter(Boolean)
      ),
    ];
    const modifiedData = await userModel.find(
      { uid: { $in: uniqueUserIds } },
      { user_first_name: 1, user_last_name: 1, uid: 1, _id: 0 }
    );

    const userMapping = Object.fromEntries(
      modifiedData.map(({ uid, user_first_name, user_last_name }) => [
        uid,
        `${user_first_name} ${user_last_name}`,
      ])
    );

    projectsData.forEach((entry) => {
      entry.listing_created_by =
        userMapping[entry.created_by] || entry.created_by;
    });

    logger.info(`✅ Successfully fetched ${projectsData.length} projects`);
    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      status: 200,
      data: { projectsData, projectsCount },
    });
  } catch (error) {
    logger.error(`❌ Error fetching projects: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 📂 Fetch All Projects
 * Retrieves all available projects with structured validation, filtering, and logging.
 */
projectsController.FetchAllProjects = async (req, res) => {
  const apiStart = new Date();
  try {
    const { organization_id } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching all projects for Organization ID: ${organization_id}`
    );

    /** 🚀 Fetch projects */
    const projectsData = await projectsModel
      .find({ organization_id }, { __v: 0 })
      .lean();

    const queryEnd = new Date();
    const timeTakenQuery1 = getTimeDifferenceInSeconds(apiStart, queryEnd);
    logger.info(`⏳ Query execution time: ${timeTakenQuery1} seconds`);

    const apiEnd = new Date();
    const timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    logger.info(`⏳ Total API execution time: ${timeTakenOverall} seconds`);

    logger.info(`✅ Successfully fetched ${projectsData.length} projects`);
    return res.status(200).json({
      success: true,
      message: "Projects fetched successfully",
      status: 200,
      data: projectsData,
    });
  } catch (error) {
    const apiEnd = new Date();
    const timeTakenOverall = getTimeDifferenceInSeconds(apiStart, apiEnd);
    logger.error(
      `❌ Error fetching projects: ${error.message}, Execution Time: ${timeTakenOverall} seconds`
    );

    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      status: 500,
      error: error.message,
    });
  }
};

// Get a single API token by ID - GET request
// projectsController.FetchToken = async (req, res) => {
//   try {
//     const { token } = req.params;
//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required parameters"
//       });
//     }
//     const apiToken = await projectsModel.findOne({ token });
//     return res.status(200).json({
//       success: true,
//       message: "API Data fetched successfully",
//       data: apiToken
//     });
//   } catch (error) {
//     return res.status(400).json({
//       success: false,
//       message: "An error occured, Please try again",
//       error: error.message,
//     });
//   }
// };

/**
 * ✏️ Update a Project
 * Validates input data and ensures structured project updates.
 */
projectsController.Update = async (req, res) => {
  try {
    const { id, data: updateData } = req.body;

    /** 🛑 Validate required field */
    if (!id || !updateData || Object.keys(updateData).length === 0) {
      logger.warn("⚠️ Missing required fields");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(`📡 Updating project for ID: ${id}`);

    /** ✏️ Sanitize input fields */
    updateData.modified_at = new Date();
    updateData.developer_name = sanitizationString(updateData.developer_name);
    updateData.project_name = sanitizationString(updateData.project_name);
    updateData.unit_no = sanitizationString(updateData.unit_no);

    /** 💾 Update project entry */
    const project = await projectsModel.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      { new: true }
    );

    if (!project) {
      logger.warn(`⚠️ Project not found for ID: ${id}`);
      return res
        .status(404)
        .json({ success: false, message: "Project not found", status: 404 });
    }

    logger.info(`✅ Project updated successfully for ID: ${id}`);
    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      status: 200,
      data: project,
    });
  } catch (error) {
    logger.error(`❌ Error updating project: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * 🔍 Fetch Project Filter Values
 * Retrieves distinct values for filtering projects with structured validation and logging.
 */
projectsController.FilterValues = async (req, res) => {
  try {
    const { organization_id } = req.query;

    /** 🛑 Validate required field */
    if (!organization_id) {
      logger.warn("⚠️ Missing required field: organization_id");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(
      `📡 Fetching filter values for Organization ID: ${organization_id}`
    );

    /** 🔄 Define aggregation stage */
    const groupStage = {
      $group: {
        _id: null,
        address: { $addToSet: "$address" },
        business_vertical: { $addToSet: "$business_vertical" },
        created_by: { $addToSet: "$created_by" },
        modified_by: { $addToSet: "$modified_by" },
        developer_name: { $addToSet: "$developer_name" },
        project_name: { $addToSet: "$project_name" },
        project_status: { $addToSet: "$project_status" },
        property_stage: { $addToSet: "$property_stage" },
        property_type: { $addToSet: "$property_type" },
        rera_link: { $addToSet: "$rera_link" },
        walkthrough_link: { $addToSet: "$walkthrough_link" },
        type: { $addToSet: "$type" },
        unit_no: { $addToSet: "$unit_no" },
        price: { $addToSet: "$price" },
        owner_name: { $addToSet: "$owner_name" },
        owner_contact_no: { $addToSet: "$owner_contact_no" },
      },
    };

    /** 🚀 Execute aggregation */
    const filterValuesForProjects = await projectsModel.aggregate([
      { $match: { organization_id } },
      groupStage,
    ]);

    if (!filterValuesForProjects.length) {
      logger.warn(
        `⚠️ No filter values found for Organization ID: ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "No filter values found",
        status: 404,
      });
    }

    /** 🔎 Map project creators */
    const uniqueUserIds = [...filterValuesForProjects[0].created_by];
    const modification = await userModel.find(
      { uid: { $in: uniqueUserIds } },
      { user_first_name: 1, user_last_name: 1, uid: 1, _id: 0 }
    );

    const userMapping = Object.fromEntries(
      modification.map(({ uid, user_first_name, user_last_name }) => [
        uid,
        `${user_first_name} ${user_last_name}`,
      ])
    );

    filterValuesForProjects[0].listing_created_by =
      filterValuesForProjects[0].created_by.map((uid) => ({
        label: userMapping[uid] || uid,
        value: uid,
      }));

    logger.info(
      `✅ Successfully fetched filter values for Organization ID: ${organization_id}`
    );
    return res.status(200).json({
      success: true,
      message: "Filter values fetched successfully",
      status: 200,
      data: filterValuesForProjects,
    });
  } catch (error) {
    logger.error(`❌ Error fetching filter values: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "An error occurred, please try again",
      status: 500,
      error: error.message,
    });
  }
};

/**
 * ❌ Delete Projects
 * Removes multiple project entries with proper validation and error handling.
 */
projectsController.Delete = async (req, res) => {
  try {
    const { projectIds } = req.body;

    /** 🛑 Validate required field */
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      logger.warn("⚠️ Missing or invalid projectIds array");
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing required parameters",
          status: 400,
        });
    }

    logger.info(`🗑 Deleting projects with IDs: ${projectIds}`);

    /** 🚀 Perform bulk deletion */
    await projectsModel.deleteMany({ _id: { $in: projectIds } });

    logger.info(`✅ Projects deleted successfully`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Projects deleted successfully",
        status: 200,
      });
  } catch (error) {
    logger.error(`❌ Error deleting projects: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "An error occurred, please try again",
        status: 500,
        error: error.message,
      });
  }
};

module.exports = projectsController;
