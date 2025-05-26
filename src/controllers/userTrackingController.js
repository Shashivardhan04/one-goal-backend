var ObjectId = require("mongoose").Types.ObjectId;
const userTrackingModel = require("../models/userTrackingSchema");
const userModel = require("../models/userSchema");
const logger = require("../services/logger");

const getBranchUsers = async (uid, organization_id, permission) => {
  try {
    /** 🛑 Validate required fields */
    if (
      !uid ||
      !organization_id ||
      !Array.isArray(permission) ||
      permission.length === 0
    ) {
      throw new Error("Required parameters are missing or invalid.");
    }

    /** 📡 Fetch users based on organization & permissions */
    const users = await userModel
      .find({ organization_id, branch: { $in: permission } }, { uid: 1 })
      .lean();

    /** 🔄 Structure user list */
    const usersList = [uid, ...users.map((user) => user.uid)];

    return usersList;
  } catch (error) {
    console.error(`❌ Error fetching branch users: ${error.message}`);
    return [];
  }
};

const getTeamUsers = async (uid, organization_id) => {
  try {
    /** 🛑 Validate required fields */
    if (!uid || !organization_id) {
      throw new Error("Required parameters are missing.");
    }

    logger.info(
      `📡 Fetching team users for UID: ${uid}, Organization ID: ${organization_id}`
    );

    /** 🔍 Fetch user details */
    const user = await userModel.findOne({ uid }).lean();
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return [];
    }

    /** 🚀 Fetch reporting users */
    const reportingUsers = await userModel
      .find({ reporting_to: user.user_email }, { uid: 1 })
      .lean();

    /** 🔄 Structure user list */
    const reportingUsersUids = reportingUsers.map((user) => user.uid);

    /** ✅ Include the original UID in the list */
    return [uid, ...reportingUsersUids];
  } catch (error) {
    logger.error(`❌ Error fetching team users: ${error.message}`);
    return [];
  }
};

const userTrackingController = {};

/**
 * 🔄 Update Tracking Data for a Specific Date
 * Updates or inserts tracking records with structured validation and logging.
 */
userTrackingController.updateTrackingForDate = async (req, res) => {
  try {
    const { uid, organization_id, coordinates, date } = req.body;

    /** 🛑 Validate required fields */
    if (!uid || !organization_id || !coordinates || !date) {
      logger.warn("⚠️ Missing required fields for tracking update");
      return res
        .status(400)
        .json({
          success: false,
          message: "All required fields must be provided",
          status: 400,
        });
    }

    const todayDate = new Date(date);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);

    logger.info(
      `📡 Updating tracking data for UID: ${uid}, Organization ID: ${organization_id}`
    );

    /** 🔍 Define query conditions */
    const query = {
      organization_id,
      uid,
      date: {
        $gte: todayDate.toISOString().substring(0, 10),
        $lt: tomorrowDate.toISOString().substring(0, 10),
      },
    };

    /** 🔄 Update coordinates */
    const update = {
      $push: {
        coordinates: {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          timestamp: todayDate,
        },
      },
      date: todayDate,
    };

    /** ✅ Update user's last tracking timestamp */
    const userUpdate = { last_tracked_date_and_time: todayDate };

    /** 🚀 Execute updates */
    const updatedTracking = await userTrackingModel.findOneAndUpdate(
      query,
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const updatedUser = await userModel.findOneAndUpdate({ uid }, userUpdate, {
      new: true,
    });

    logger.info(`✅ Tracking data updated successfully for UID: ${uid}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Tracking data updated successfully",
        status: 200,
        data: updatedTracking,
      });
  } catch (error) {
    logger.error(`❌ Error updating tracking data: ${error.message}`);
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
 * 🔍 Get Tracking Data for a Specific Date
 * Retrieves user tracking information with structured validation and logging.
 */
userTrackingController.getTrackingForDate = async (req, res) => {
  try {
    const { uid, date, organization_id } = req.body;

    /** 🛑 Validate required fields */
    if (!uid || !date || !organization_id) {
      logger.warn("⚠️ Missing required fields for tracking retrieval");
      return res
        .status(400)
        .json({
          success: false,
          message: "All required fields must be provided",
          status: 400,
        });
    }

    /** 🔄 Format date range for query */
    const todayDate = new Date(date);
    const nextDate = new Date(todayDate);
    nextDate.setDate(todayDate.getDate() + 1);

    logger.info(
      `📡 Fetching tracking data for UID: ${uid}, Organization ID: ${organization_id}`
    );

    /** 🚀 Execute query */
    const query = {
      organization_id,
      uid,
      date: {
        $gte: todayDate.toISOString().substring(0, 10),
        $lt: nextDate.toISOString().substring(0, 10),
      },
    };

    const trackingData = await userTrackingModel.find(query).lean();

    /** 🛑 Handle case where no tracking data exists */
    if (!trackingData.length) {
      logger.warn(`⚠️ No tracking data found for UID: ${uid}, Date: ${date}`);
      return res
        .status(404)
        .json({
          success: false,
          message: "No tracking data found",
          status: 404,
        });
    }

    logger.info(`✅ Tracking data retrieved successfully for UID: ${uid}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Tracking data retrieved successfully",
        status: 200,
        data: trackingData,
      });
  } catch (error) {
    logger.error(`❌ Error fetching tracking data: ${error.message}`);
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
 * 🔍 Get Users List for Tracking
 * Retrieves a list of users based on profile permissions and live tracking status.
 */
userTrackingController.getUsersListForTracking = async (req, res) => {
  try {
    const {
      uid,
      searchString = "",
      page = 1,
      status,
      organization_id,
    } = req.body;

    /** 🛑 Validate required fields */
    if (!uid || !organization_id) {
      logger.warn("⚠️ Missing required fields for user tracking retrieval");
      return res
        .status(400)
        .json({
          success: false,
          message: "User ID and Organization ID are required",
          status: 400,
        });
    }

    logger.info(
      `📡 Fetching users for tracking - UID: ${uid}, Organization ID: ${organization_id}`
    );

    /** 🔍 Build search query */
    const searchTerms = searchString
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term !== "")
      .map((term) => new RegExp(term, "i"));

    let userQuery = { organization_id, status: "ACTIVE" };

    if (searchTerms.length) {
      userQuery["$or"] = [
        { user_first_name: { $in: searchTerms } },
        { user_last_name: { $in: searchTerms } },
        { user_email: { $in: searchTerms } },
      ];
    } else if (typeof status === "boolean") {
      userQuery["is_live_tracking_active"] = status;
    }

    /** 🚀 Fetch user details */
    const user = await userModel.findOne({ uid }).lean();
    if (!user) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    const { profile, branchPermission } = user;

    /** 🔄 Fetch relevant users */
    let usersList = [];
    if (["lead manager", "admin"].includes(profile.toLowerCase())) {
      usersList = branchPermission?.includes("All")
        ? await userModel.find(userQuery).select("uid -_id").lean()
        : await getBranchUsers(uid, organization_id, branchPermission);
    } else if (profile.toLowerCase() === "team lead") {
      usersList = await getTeamUsers(uid, organization_id);
    } else {
      logger.warn(`⚠️ Incorrect profile type for tracking: ${profile}`);
      return res
        .status(400)
        .json({ success: false, message: "Incorrect Profile", status: 400 });
    }

    /** ⏳ Paginate results */
    const paginatedUsers = await userModel
      .find({ uid: { $in: usersList } })
      .skip((page - 1) * 5)
      .limit(5)
      .lean();

    logger.info(`✅ Users list retrieved successfully`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Users list retrieved successfully",
        status: 200,
        data: paginatedUsers,
      });
  } catch (error) {
    logger.error(`❌ Error fetching users list for tracking: ${error.message}`);
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
 * ✅ Update User Tracking Status
 * Toggles live tracking status with structured validation and logging.
 */
userTrackingController.updateUserTrackingStatus = async (req, res) => {
  try {
    const { uid, status } = req.body;

    /** 🛑 Validate required fields */
    if (!uid || typeof status !== "boolean") {
      logger.warn(
        "⚠️ Missing or invalid required fields for tracking status update"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "User ID and valid boolean status are required",
          status: 400,
        });
    }

    logger.info(
      `📡 Updating tracking status for UID: ${uid}, Status: ${status}`
    );

    /** 🚀 Execute update */
    const updatedUser = await userModel.findOneAndUpdate(
      { uid },
      { is_live_tracking_active: status },
      { new: true }
    );

    /** 🛑 Handle missing user */
    if (!updatedUser) {
      logger.warn(`⚠️ User not found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "User not found", status: 404 });
    }

    logger.info(`✅ Tracking status updated successfully for UID: ${uid}`);
    return res
      .status(200)
      .json({
        success: true,
        message: "Tracking status updated successfully",
        status: 200,
        data: updatedUser,
      });
  } catch (error) {
    logger.error(`❌ Error updating tracking status: ${error.message}`);
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
 * ➕ Insert Tracking Data
 * Adds new tracking records for users in an organization.
 */
userTrackingController.insertTrackingData = async (req, res) => {
  try {
    const { organization_id } = req.body;

    /** 🛑 Validate required fields */
    if (!organization_id) {
      logger.warn(
        "⚠️ Missing required organization ID for tracking data insertion"
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Organization ID is required",
          status: 400,
        });
    }

    logger.info(`📡 Fetching users for Organization ID: ${organization_id}`);

    /** 🚀 Fetch users in the organization */
    const users = await userModel.find({ organization_id }).lean();

    if (!users.length) {
      logger.warn(`⚠️ No users found for Organization ID: ${organization_id}`);
      return res
        .status(404)
        .json({ success: false, message: "No users found", status: 404 });
    }

    /** 🔍 Fetch existing tracking data */
    const trackingData = await userTrackingModel
      .findOne({
        organization_id: "W5phvDYBAtopkrdehko2",
        uid: "Xs80YfvyUZV26NrC9mIdEfa6MlJ3",
        date: { $gte: new Date("2023-03-30"), $lt: new Date("2023-03-31") },
      })
      .lean();

    if (!trackingData) {
      logger.warn("⚠️ No tracking data found for the specified query");
      return res
        .status(404)
        .json({
          success: false,
          message: "Tracking data not found",
          status: 404,
        });
    }

    /** 🚀 Insert tracking data for each user asynchronously */
    await Promise.all(
      users.map(async (user) => {
        const newTrackingEntry = new userTrackingModel({
          organization_id: "DG5T5Sx77iCdhj0SnHsj",
          uid: user.uid,
          coordinates: trackingData.coordinates,
          date: new Date("2023-07-15"),
        });

        await newTrackingEntry.save();
        logger.info(`✅ Tracking data saved for UID: ${user.uid}`);
      })
    );

    logger.info("✅ All tracking data inserted successfully");
    return res
      .status(201)
      .json({
        success: true,
        message: "Tracking data inserted successfully",
        status: 201,
      });
  } catch (error) {
    logger.error(`❌ Error inserting tracking data: ${error.message}`);
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
 * 🔄 Update Live Tracking Status
 * Updates live tracking status for users whose last tracked date is outdated or missing.
 */
userTrackingController.updateLiveTrackingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    /** 🛑 Validate required fields */
    if (typeof status !== "boolean") {
      logger.warn("⚠️ Missing or invalid tracking status for update");
      return res
        .status(400)
        .json({
          success: false,
          message: "A valid boolean status is required",
          status: 400,
        });
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Ensure date-only comparison

    logger.info(`📡 Updating live tracking status to ${status}`);

    /** 🔍 Define update conditions */
    const query = {
      is_live_tracking_active: true,
      $or: [
        { last_tracked_date_and_time: { $lt: currentDate } },
        { last_tracked_date_and_time: { $exists: false } },
      ],
    };

    /** 🚀 Execute update */
    const updatedDocuments = await userModel.updateMany(query, {
      is_live_tracking_active: status,
    });

    logger.info(
      `✅ Live tracking status updated successfully for ${updatedDocuments.modifiedCount} users`
    );

    return res.status(200).json({
      success: true,
      message: "Live tracking status updated successfully",
      status: 200,
      modifiedCount: updatedDocuments.modifiedCount,
    });
  } catch (error) {
    logger.error(`❌ Error updating live tracking status: ${error.message}`);
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

module.exports = userTrackingController;
