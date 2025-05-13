const userModel = require("../models/userSchema");
const leadsModel = require("../models/leadsSchema");
const taskModel = require("../models/taskSchema");
const callLogsModel = require("../models/callLogsSchema");
const moment = require("moment");
const {
  verifyPassword,
  hashPassword,
  generateSalt,
} = require("../functions/authScrypt");
const userAuthorizationModel = require("../models/userAuthorizationSchema.js");
const organizationModel = require("../models/organizationSchema");
const mongoose = require("mongoose");
const { getTimeDifferenceInSeconds } = require("../constants/constants.js");
const axios = require("axios");
const { encryptPAN, decryptPAN } = require("../constants/constants");
const MB_URL = process.env.MB_URL;
const {
  generateRandomString,
  generateDefaultPassword,
} = require("../functions/validation.js");
const logger = require("../services/logger");
const app = require("firebase");
var ObjectId = require("mongoose").Types.ObjectId;
const timestamp = app.firestore.Timestamp;

const isMobileNoValid = (mobile) => {
  // Check if the mobile number is numeric and has a length between 10 and 15
  if (!/^\d{10,15}$/.test(mobile)) {
    return "Mobile number should be of min. 10 digits. Please re-enter";
  }

  // Check if the mobile number starts with a 0
  if (mobile.startsWith("0")) {
    return "Mobile number should not start with 0. Please re-enter.";
  }

  // Check if the mobile number starts with 6, 7, 8, or 9
  if (!/^[6789]/.test(mobile)) {
    return "Invalid Mobile Number. Please re-enter";
  }

  return true;
};

const getBranchUsers = async (uid, organization_id, permission) => {
  const users = await userModel.find(
    {
      organization_id,
      branch: { $in: permission },
    },
    { uid: 1 }
  );
  let usersList = [uid];
  users.forEach((user) => usersList.push(user.uid));
  return usersList;
};

const getTeamUsers = async (uid, organization_id) => {
  const user = await userModel.findOne({ uid });
  let reportingUsers = await userModel.find({ reporting_to: user.user_email });
  let reportingUsersUids = [];
  reportingUsers.map((item) => {
    reportingUsersUids.push(item.uid);
  });
  return reportingUsersUids;
  // const users = await userModel.find({ organization_id });
  // const user = users.filter((user) => user.uid === uid);
  // let reportingToMap = {};
  // let usersList = [user[0].uid];

  // users.forEach((item) => {
  //   if (item.reporting_to === "") {
  //     return;
  //   }
  //   if (reportingToMap[item.reporting_to]) {
  //     reportingToMap[item.reporting_to].push({
  //       user_email: item.user_email,
  //       uid: item.uid,
  //     });
  //   } else {
  //     reportingToMap[item.reporting_to] = [
  //       { user_email: item.user_email, uid: item.uid },
  //     ];
  //   }
  // });

  // const createUsersList = (email, data) => {
  //   if (data[email] === undefined) {
  //     return;
  //   } else {
  //     data[email].forEach((user) => {
  //       if (usersList.includes(user.uid)) {
  //         return;
  //       }
  //       usersList.push(user.uid);
  //       createUsersList(user.user_email, data);
  //     });
  //   }
  // };

  // createUsersList(user[0].user_email, reportingToMap);

  // return usersList;
};

const checkUserExistsInOrganization = async (
  organization_id,
  user_email,
  contact_no,
  employee_id
) => {
  if (employee_id) {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      // organization_id,
      $or: [
        // { user_email },
        { contact_no },
        { employee_id },
      ],
    });

    if (existingUser) {
      return true;
    } else {
      return false;
    }
  } else {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      contact_no,
    });

    if (existingUser) {
      return true;
    } else {
      return false;
    }
  }
};

// const checkUserExistsInReadpro = async (organization_id, user_email, contact_no, employee_id, uid) => {
//   if (employee_id) {
//     // Check if email, contact_no, or employee_id already exists in the organization
//     const existingUser = await userModel.findOne({
//       organization_id,
//        employee_id
//     });

//     if (existingUser) {
//       if (existingUser.uid == uid) {
//         return false;
//       } else {
//         return true;
//       }
//     } else {
//       return false;
//     }
//   } else {
//     // Check if email, contact_no, or employee_id already exists in the organization
//     const existingUser = await userModel.findOne({
//       contact_no
//     });

//     if (existingUser) {
//       if (existingUser.uid == uid) {
//         return false;
//       } else {
//         return true;
//       }
//     } else {
//       return false;
//     }
//   }

// }

const checkEmployeedIdInReadpro = async (
  organization_id,
  user_email,
  contact_no,
  employee_id,
  uid
) => {
  if (employee_id) {
    // Check if email, contact_no, or employee_id already exists in the organization
    const existingUser = await userModel.findOne({
      organization_id,
      employee_id,
    });

    if (existingUser) {
      if (existingUser.uid == uid) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }
};

const checkMobileNumberExistsInReadpro = async (
  organization_id,
  user_email,
  contact_no,
  employee_id,
  uid
) => {
  if (contact_no) {
    const existingUser = await userModel.findOne({
      contact_no,
    });

    if (existingUser) {
      if (existingUser.uid == uid) {
        return false;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }
};

const isValidMobile = (mobile) => {
  // Check if the mobile number is numeric and has a length between 10 and 15
  if (!/^\d{10,10}$/.test(mobile)) {
    return false;
  }

  // Check if the mobile number starts with a 0
  if (mobile.startsWith("0")) {
    return false;
  }

  // Check if the mobile number starts with 6, 7, 8, or 9
  if (!/^[6789]/.test(mobile)) {
    return false;
  }

  return true;
};

// Initialize userController if not already declared
const userController = {};

/**
 * Convert Firestore-style timestamp to JavaScript Date
 */
const convertTimestamp = (ts) =>
  ts && typeof ts === "object" && "_seconds" in ts
    ? new Date(ts._seconds * 1000)
    : new Date();

/**
 * Insert a new user into the database
 */
userController.Insert = async (req, res) => {
  try {
    logger.info("📥 User Insert API called");

    const {
      created_at,
      activated_at,
      deactivated_at,
      OID,
      SOID,
      uid,
      user_email,
      ...restBody
    } = req.body;

    // 1. Validate required fields
    if (!uid || !user_email) {
      logger.warn("⚠️ Missing required fields: uid or user_email");
      return res.status(400).json({
        status: 400,
        error: "Validation error",
        message: "UID and user_email are required.",
      });
    }

    // 2. Check for existing user
    const existingUser = await userModel.findOne({
      $or: [{ uid }, { user_email }],
    });

    if (existingUser) {
      logger.warn("⚠️ Duplicate user insert attempt detected");
      return res.status(409).json({
        status: 409,
        error: "Conflict",
        message: "User with given UID or email already exists.",
      });
    }

    // 3. Prepare and save user
    const userData = {
      ...restBody,
      uid,
      user_email,
      created_at: convertTimestamp(created_at),
      activated_at: convertTimestamp(activated_at),
      deactivated_at: convertTimestamp(deactivated_at),
      user_oid: OID,
      user_super_oid: SOID,
    };

    const newUser = new userModel(userData);
    const savedUser = await newUser.save();

    logger.info(`✅ User created successfully (ID: ${savedUser.uid})`);
    return res.status(201).json({
      status: 201,
      message: "User created successfully.",
      userId: savedUser.uid,
    });
  } catch (err) {
    // 4. Handle validation errors
    if (err.name === "ValidationError") {
      logger.error("❌ Mongoose Validation Error", err);
      return res.status(400).json({
        status: 400,
        error: "Validation error",
        message: err.message,
        fields: err.errors,
      });
    }

    // 5. Handle duplicate key error
    if (err.code === 11000) {
      logger.error("❌ Duplicate key error", err);
      return res.status(409).json({
        status: 409,
        error: "Duplicate entry",
        message: "User already exists with same UID or email.",
        fields: err.keyValue,
      });
    }

    // 6. Fallback error
    logger.error("❌ Internal server error during user insert", err);
    return res.status(500).json({
      status: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred. Please try again later.",
    });
  }
};

/**
 * Get User By  uid and user_email from database
 */

userController.GetUser = async (req, res) => {
  try {
    const { uid, user_email } = req.query;

    // Validate input
    if (!uid && !user_email) {
      logger.warn("⚠️ Missing required fields: uid or user_email");
      return res.status(400).json({
        status: 400,
        success: false,
        error: "Missing uid or user_email in query parameters.",
      });
    }

    const query = {};
    if (uid) query.uid = uid;
    if (user_email) query.user_email = user_email;

    const result = await userModel.findOne(query).lean();

    if (result) {
      logger.info(
        `✅ User found: UID=${uid || "N/A"}, Email=${user_email || "N/A"}`
      );
      return res.status(200).json({
        status: 200,
        success: true,
        message: "User found",
        data: result,
      });
    } else {
      logger.warn("⚠️ User not found for provided query");
      return res.status(404).json({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }
  } catch (error) {
    logger.error("❌ Error while fetching user", error);
    return res.status(500).json({
      status: 500,
      success: false,
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

/**
 * Get User By  organizationId from database
 */
userController.findByOrgan_ID = async (req, res) => {
  try {
    const { organization_id } = req.query;

    // Validate query param
    if (!organization_id) {
      logger.warn("⚠️ organization_id query parameter is missing");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required query parameter: organization_id",
      });
    }

    // Query with lean for better performance
    const users = await userModel.find({ organization_id }).lean();

    if (users.length === 0) {
      logger.info(`ℹ️ No users found for organization_id: ${organization_id}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No users found for the given organization_id.",
      });
    }

    logger.info(
      `✅ Found ${users.length} users for organization_id: ${organization_id}`
    );
    return res.status(200).json({
      status: 200,
      success: true,
      message: `Found ${users.length} user(s) for organization_id: ${organization_id}`,
      count: users.length,
      data: users,
    });
  } catch (error) {
    logger.error("❌ Error in findByOrgan_ID", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error. Please try again later.",
      error: error.message,
    });
  }
};

/**
 * Update User By  uid from database
 */
userController.updateData = async (req, res) => {
  try {
    logger.info("🔧 updateData API called");

    const updateData = { ...req.body };

    if (!updateData.uid) {
      logger.warn("⚠️ UID is missing in update request");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "UID is required to update user data.",
      });
    }

    // Convert Firestore-style timestamps
    updateData.created_at = convertTimestamp(updateData.created_at);
    updateData.activated_at = convertTimestamp(updateData.activated_at);
    updateData.deactivated_at = convertTimestamp(updateData.deactivated_at);

    const updatedUser = await userModel
      .findOneAndUpdate(
        { uid: updateData.uid },
        { $set: updateData },
        { new: true, runValidators: true }
      )
      .lean();

    if (!updatedUser) {
      logger.warn(`⚠️ User not found with UID: ${updateData.uid}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: `User not found with UID: ${updateData.uid}`,
      });
    }

    logger.info(`✅ User updated successfully (UID: ${updateData.uid})`);
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User updated successfully.",
      data: updatedUser,
    });
  } catch (error) {
    logger.error("❌ Error updating user", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error while updating user.",
      error: error.message,
    });
  }
};

/**
 * GET /users/FindByUid?uid=some_uid
 */
userController.FindByUid = async (req, res) => {
  try {
    const { uid } = req.query;

    if (!uid) {
      logger.warn("⚠️ UID query parameter is missing");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "UID is required in query parameters.",
      });
    }

    const user = await userModel.findOne({ uid }).lean();

    if (!user) {
      logger.info(`❌ No user found with UID: ${uid}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }

    logger.info(`✅ User found: ${uid}`);
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User retrieved successfully.",
      data: user,
    });
  } catch (err) {
    logger.error("❌ Error retrieving user by UID", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error.",
      error: err.message,
    });
  }
};

/**
 * GET a list of users
 */

userController.GetUsersList = async (req, res) => {
  try {
    const { uid, searchString } = req.query;

    if (!uid) {
      logger.warn("⚠️ UID query parameter missing");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "UID is required.",
      });
    }

    const user = await userModel.findOne({ uid }).lean();
    if (!user) {
      logger.warn(`❌ No user found with UID: ${uid}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }

    const profile = user.profile?.toLowerCase();
    const organization_id = user.organization_id;
    const permission = user.branchPermission || [];

    let searchRegexList = [];

    if (searchString) {
      searchString.split(",").forEach((str) => {
        const clean = str.trim();
        if (clean) searchRegexList.push(new RegExp(clean, "i"));
      });
    }

    const baseQuery = {
      organization_id,
      ...(searchRegexList.length && {
        $or: [
          { user_first_name: { $in: searchRegexList } },
          { user_last_name: { $in: searchRegexList } },
          { user_email: { $in: searchRegexList } },
        ],
      }),
    };

    const reportingUsers = await userModel
      .find(baseQuery)
      .select("uid -_id")
      .lean();
    const reportingUIDs = reportingUsers.map((u) => u.uid);

    let finalUIDs = [];

    if (profile === "admin" || profile === "lead manager") {
      if (permission.length === 0 || permission.includes("All")) {
        finalUIDs = reportingUIDs;
      } else {
        const branchUsers = await getBranchUsers(
          uid,
          organization_id,
          permission
        );
        finalUIDs = branchUsers.filter((id) => reportingUIDs.includes(id));
      }
    } else if (profile === "team lead") {
      const teamUsers = await getTeamUsers(uid, organization_id);
      finalUIDs = teamUsers.filter((id) => reportingUIDs.includes(id));
    } else {
      // ✅ For other users like sales-profile, allow only their own UID
      finalUIDs = [uid];
    }

    if (finalUIDs.length === 0) {
      logger.info("⚠️ No matching users found after filtering");
      return res.status(200).json({
        status: 200,
        success: true,
        count: 0,
        message: "No users matched the criteria.",
        data: [],
      });
    }
    const finalQuery = {
      status: { $regex: "^active$", $options: "i" }, // case-insensitive exact match
      uid: { $in: finalUIDs },
    };

    const userData = await userModel.find(finalQuery).limit(10).lean();

    logger.info(`✅ ${userData.length} users retrieved successfully`);
    return res.status(200).json({
      status: 200,
      success: true,
      count: userData.length,
      message: "User list fetched successfully.",
      data: userData,
    });
  } catch (error) {
    logger.error("❌ Error fetching user list", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * Update UserRating of users
 */
userController.UpdateUserRating = async (req, res) => {
  const { uid, rating, rating_given_by } = req.body; // Destructure input

  // Validate input data
  if (!uid || !rating || !rating_given_by) {
    logger.warn("⚠️ Missing required fields: uid, rating, or rating_given_by");
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Missing required fields: uid, rating, or rating_given_by",
    });
  }

  try {
    // Query to find the user by UID
    const query = { uid };
    const update = {
      user_rating: rating,
      rating_given_by,
    };
    const options = { new: true }; // Return updated document

    // Update the user document
    const updatedDocument = await userModel.findOneAndUpdate(
      query,
      update,
      options
    );

    // Check if document was found and updated
    if (!updatedDocument) {
      logger.warn(`❌ User with UID: ${uid} not found for rating update`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: `User with UID: ${uid} not found.`,
      });
    }

    // Success response
    logger.info(`✅ User rating updated successfully for UID: ${uid}`);
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User rating updated successfully.",
      data: updatedDocument,
    });
  } catch (err) {
    // Log error and return failure response
    logger.error("❌ Error updating user rating", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

/**
 *  GetUserReport of users Data
 */
userController.GetUserReport = async (req, res) => {
  const { uid } = req.query;

  if (!uid) {
    logger.warn("⚠️ Missing required query parameter: uid");
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Missing required query parameter: uid",
    });
  }

  try {
    const startDate = moment().startOf("month").utcOffset("+05:30").toDate();
    const endDate = moment().utcOffset("+05:30").toDate();

    const dateRange = {
      $gte: startDate,
      $lte: endDate,
    };

    // Define all queries in parallel
    const [totalCalls, totalWon, totalInterested, totalMissed, totalMeetings] =
      await Promise.all([
        callLogsModel.countDocuments({
          uid,
          created_at: dateRange,
        }),
        leadsModel.countDocuments({
          uid,
          stage: "WON",
          stage_change_at: dateRange,
        }),
        leadsModel.countDocuments({
          uid,
          stage: "INTERESTED",
          stage_change_at: dateRange,
        }),
        taskModel.countDocuments({
          uid,
          status: "Pending",
          due_date: { $lt: endDate },
        }),
        taskModel.countDocuments({
          uid,
          type: { $in: ["Site Visit", "Meeting"] },
          status: "Completed",
          completed_at: dateRange,
        }),
      ]);

    logger.info(`📈 Report generated for UID: ${uid}`);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "User report generated successfully.",
      data: {
        totalCalls,
        totalWon,
        totalInterested,
        totalMissed,
        totalMeetings,
      },
    });
  } catch (error) {
    logger.error("❌ Error generating user report", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 *  fetchSpecificData of users Data
 */
userController.fetchSpecificData = async (req, res) => {
  const apiStart = new Date();
  const { uid } = req.query;

  if (!uid) {
    logger.warn("⚠️ Missing required query parameter: uid");
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Missing required query parameter: uid",
    });
  }

  try {
    const projection = {
      employee_id: 1,
      user_first_name: 1,
      user_last_name: 1,
      user_email: 1,
    };

    const userResult = await userModel.findOne({ uid });
    const queryTime1 = getTimeDifferenceInSeconds(apiStart, new Date());

    if (!userResult) {
      logger.warn(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: `User not found for UID: ${uid}`,
      });
    }

    const { profile, organization_id, branchPermission, user_email } =
      userResult;
    let query = {};

    if (["lead manager", "admin"].includes(profile.toLowerCase())) {
      if (
        !branchPermission ||
        branchPermission.length === 0 ||
        branchPermission.includes("All")
      ) {
        query = { organization_id };
      } else {
        query = { organization_id, branch: { $in: branchPermission } };
      }
    } else if (["team lead", "team leader"].includes(profile.toLowerCase())) {
      query = { organization_id, reporting_to: user_email };
    } else {
      query = { uid };
    }

    const users = await userModel.find(query, projection);
    const queryTime2 = getTimeDifferenceInSeconds(apiStart, new Date());

    const Employee_id = [];
    const Employee_Name = [];

    users.forEach(
      ({ employee_id, user_first_name, user_last_name, user_email }) => {
        if (employee_id) {
          Employee_id.push({ label: employee_id, value: user_email });
        }
        const fullName = `${user_first_name} ${user_last_name}`;
        Employee_Name.push({ label: fullName, value: user_email });
      }
    );

    const apiEnd = new Date();
    const totalApiTime = getTimeDifferenceInSeconds(apiStart, apiEnd);

    logger.info(
      `✅ /fetchSpecificData success | UID: ${uid} | User Count: ${users.length} | DB Query Time: ${queryTime2}s | Total API Time: ${totalApiTime}s`
    );

    return res.status(200).json({
      status: 200,
      success: true,
      message: "User data fetched successfully.",
      data: { Employee_id, Employee_Name },
    });
  } catch (error) {
    logger.error("❌ Error in /fetchSpecificData", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 *  getUserDetail of users Data
 */
userController.getUserDetail = async (req, res) => {
  const { uid } = req.query;

  if (!uid) {
    logger.warn("⚠️ UID query parameter is required");
    return res.status(400).json({
      status: 400,
      success: false,
      message: "UID query parameter is required",
    });
  }

  try {
    const user = await userModel.findOne({ uid });

    if (!user) {
      logger.warn(`❌ User not found for UID: ${uid}`);
      return res.status(404).json({
        status: 404,
        success: false,
        message: `User not found for UID: ${uid}`,
      });
    }

    logger.info(`✅ User detail fetched successfully for UID: ${uid}`);
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User detail fetched successfully",
      data: user,
    });
  } catch (err) {
    logger.error("❌ Error fetching user detail:", err);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};

/**
 *  createUsersInMB of users Data
 */
const createUsersInMB = async (
  mobile,
  email,
  firstname,
  lastname,
  city,
  country,
  super_user_oid
) => {
  const requestData = {
    ubimobile: mobile,
    ubiemail: email,
    ubifname: firstname,
    ubilname: lastname,
    ubiusertype: "I", // Individual
    source: "ReadPro",
    geoCity: "2624", // static or consider using dynamic from `city` later
    superuser: super_user_oid,
  };

  const url = `${MB_URL}/userauthapi/user-registration-mb`;

  try {
    logger.info("📤 Sending request to create user in MB", {
      url,
      requestData,
    });

    const response = await axios.post(url, requestData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const responseData = response.data;

    if (!responseData || !responseData.USERID) {
      logger.error("❌ Failed to create user in MB", {
        message: responseData?.MESSAGE || "No USERID returned",
        data: responseData,
      });
      return {
        success: false,
        message: responseData?.MESSAGE || "User creation failed",
      };
    }

    logger.info("✅ User created successfully in MB", {
      userId: responseData.USERID,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      userId: responseData.USERID,
    };
  } catch (error) {
    logger.error("❌ Error calling createUsersInMB API", {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      message: "Internal error while creating user in MB",
      error: error.message,
    };
  }
};

/**
 *  createUserWithAuth of users Data
 */
userController.createUserWithAuth = async (req, res) => {
  const session = await mongoose.startSession();
  let UserInMb = "";

  try {
    session.startTransaction();
    const {
      user_email,
      contact_no,
      employee_id,
      organization_id,
      profile,
      SOID,
      OID,
    } = req.body;

    logger.info("📥 Starting user creation", { user_email, organization_id });

    // Email and Mobile Validation
    const existingUser = await userModel.findOne({ user_email });
    if (existingUser) {
      logger.warn("⚠️ User with email already exists", { user_email });
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Email ID already exists",
      });
    }

    const phoneValidation = isMobileNoValid(contact_no);
    if (phoneValidation !== true) {
      logger.warn("⚠️ Invalid contact number", { contact_no });
      return res.status(400).json({
        status: 400,
        success: false,
        message: phoneValidation,
      });
    }

    const userExistsInOrg = await checkUserExistsInOrganization(
      organization_id,
      user_email,
      contact_no,
      employee_id
    );
    if (userExistsInOrg) {
      logger.warn("⚠️ Duplicate user in organization", {
        user_email,
        employee_id,
        contact_no,
      });
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "User with the same contact number, or employee ID already exists in the organization",
      });
    }

    const organization = await organizationModel.findOne({ organization_id });
    if (!organization) {
      logger.error("❌ Organization not found", { organization_id });
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Organization not found",
      });
    }

    const { city, country } = organization;

    // Assign role
    const roleMap = {
      "Lead Manager": "Lead Manager",
      "Team Lead": "Team Lead",
      Sales: "Sales",
      "Operation Manager": "Operation Manager",
    };
    const role = roleMap[profile] || "User";

    // Prepare password
    const defaultPassword = generateDefaultPassword(req.body);
    const passwordSalt = generateSalt();
    const hashedPassword = await hashPassword(defaultPassword, passwordSalt);
    const uid = new ObjectId();

    // Create user in MB
    if (SOID) {
      const mbResult = await createUsersInMB(
        contact_no,
        user_email,
        req.body.user_first_name,
        req.body.user_last_name,
        city,
        country,
        SOID
      );

      if (!mbResult || mbResult === false) {
        logger.error("❌ Failed to create user in MB", { user_email });
        throw new Error("Failed to create user in MB");
      }

      UserInMb = mbResult;
    }

    const newUserPayload = {
      contact_no,
      created_by: req.body.created_by,
      designation: req.body.designation,
      branch: req.body.branch,
      device_id: req.body.device_id,
      organization_id,
      profile,
      reporting_to: req.body.reporting_to,
      status: req.body.status,
      team: req.body.team,
      uid,
      user_email,
      user_first_name: req.body.user_first_name,
      user_image: req.body.user_image,
      user_last_name: req.body.user_last_name,
      branchPermission: req.body.branchPermission,
      leadView: req.body.leadView,
      group_head_name: req.body.group_head_name,
      employee_id,
      password: hashedPassword,
      passwordSalt,
      role,
      first_login: true,
      user_oid: OID || UserInMb,
      user_super_oid: SOID || "",
    };

    const [newUser] = await userModel.create([newUserPayload], { session });

    await session.commitTransaction();
    logger.info("✅ User created successfully", { user_email, uid });

    return res.status(201).json({
      status: 201,
      success: true,
      message: "User created successfully",
      data: { user: newUser },
    });
  } catch (error) {
    logger.error("❌ Error during user creation", {
      error: error.message,
      stack: error.stack,
    });

    await session.abortTransaction();
    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred while creating user",
      error: error.message,
    });
  } finally {
    session.endSession();
    logger.info("📤 DB session closed for user creation");
  }
};

/**
 *  Update of users Data
 */
userController.Update = async (req, res) => {
  try {
    const {
      data: updateDataRaw,
      organization_id,
      uid,
      user_email,
      contact_no,
      employee_id,
    } = req.body;

    logger.info("🔄 User update request received", { uid, organization_id });

    if (!organization_id || !uid) {
      logger.warn("⚠️ Missing organization_id or uid", {
        organization_id,
        uid,
      });
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameters: organization_id or uid",
      });
    }

    // Handle profile -> role mapping
    const roleMap = {
      "Lead Manager": "Lead Manager",
      "Team Lead": "Team Lead",
      Sales: "Sales",
      "Operation Manager": "Operation Manager",
    };

    let updateData = { ...updateDataRaw };
    if (updateData.profile && roleMap[updateData.profile]) {
      updateData.role = roleMap[updateData.profile];
    }

    // Validate mobile number
    if (contact_no) {
      const isMobileValid = isValidMobile(contact_no);
      if (!isMobileValid) {
        logger.warn("⚠️ Invalid mobile number", { contact_no });
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Invalid mobile number",
        });
      }

      const contactExists = await checkMobileNumberExistsInReadpro(
        organization_id,
        user_email,
        contact_no,
        employee_id,
        uid
      );
      if (contactExists) {
        logger.warn("⚠️ Mobile number already exists", { contact_no });
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Mobile number already exists",
        });
      }
    }

    // Validate employee ID
    if (employee_id) {
      const employeeExists = await checkEmployeedIdInReadpro(
        organization_id,
        user_email,
        contact_no,
        employee_id,
        uid
      );
      if (employeeExists) {
        logger.warn("⚠️ Employee ID already exists", { employee_id });
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Employee ID already exists",
        });
      }
    }

    const updatedUser = await userModel.findOneAndUpdate(
      { organization_id, uid },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      logger.warn("⚠️ User not found for update", { organization_id, uid });
      return res.status(404).json({
        status: 404,
        success: false,
        message: "User not found",
      });
    }

    logger.info("✅ User updated successfully", { uid });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    logger.error("❌ Error while updating user", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred while updating user",
      error: error.message,
    });
  }
};

/**
 *  FetchAll of users Data
 */
userController.FetchAll = async (req, res) => {
  const apiStart = Date.now();
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      logger.warn("⚠️ Missing organization_id in request query");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameter: organization_id",
      });
    }

    logger.info(
      `📦 Fetching all users for organization_id: ${organization_id}`
    );

    // Projection to exclude sensitive/internal fields
    const projection = {
      __v: 0,
      device_id: 0,
      session_id: 0,
      device_type: 0,
      first_login: 0,
      fcm_token: 0,
      is_mobile_updation_declared: 0,
      user_mb_isd: 0,
      user_last_login_time: 0,
      password: 0,
      passwordSalt: 0,
      token: 0,
    };

    const usersDataRaw = await userModel
      .find({ organization_id }, projection)
      .sort({ created_at: -1 })
      .lean();

    const usersData = usersDataRaw.map((user) => ({
      ...user,
      mb_oid_mapped: user.user_oid ? "Yes" : "No",
    }));

    const timeTakenMs = Date.now() - apiStart;
    logger.info(`✅ Fetched ${usersData.length} users in ${timeTakenMs}ms`);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Users fetched successfully",
      data: { usersData },
    });
  } catch (error) {
    const timeTakenMs = Date.now() - apiStart;
    logger.error("❌ Error fetching users", {
      error: error.message,
      stack: error.stack,
      durationMs: timeTakenMs,
    });

    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred while fetching users",
      error: error.message,
    });
  }
};

/**
 *  FetchUser of users Data
 */
userController.FetchUser = async (req, res) => {
  const apiStart = Date.now();
  try {
    const { uid } = req.query;

    if (!uid) {
      logger.warn("⚠️ Missing required parameter: uid");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameter: uid",
      });
    }

    logger.info(`📋 Fetching user with UID: ${uid}`);

    const projection = { password: 0, passwordSalt: 0 };
    const user = await userModel.findOne({ uid }, projection).lean();

    if (!user) {
      logger.warn(`❌ No user found with UID: ${uid}`);
      return res.status(404).json({
        status: 400,
        success: false,
        message: "User not found",
      });
    }

    const durationMs = Date.now() - apiStart;
    logger.info(`✅ User fetched successfully in ${durationMs}ms`);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "User fetched successfully",
      data: { user },
    });
  } catch (error) {
    const durationMs = Date.now() - apiStart;
    logger.error("❌ Error fetching user", {
      error: error.message,
      stack: error.stack,
      durationMs,
    });

    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred while fetching user",
      error: error.message,
    });
  }
};

/**
 *  FetchReportingUser of users Data
 */
userController.FetchReportingUser = async (req, res) => {
  const apiStart = Date.now();
  try {
    const { user_email } = req.query;

    if (!user_email) {
      logger.warn("⚠️ Missing required parameter: user_email");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameter: user_email",
      });
    }

    logger.info(`📋 Fetching reporting user by email: ${user_email}`);

    const projection = { password: 0, passwordSalt: 0 };
    const user = await userModel.findOne({ user_email }, projection).lean();

    if (!user) {
      logger.warn(`❌ No user found with email: ${user_email}`);
      return res.status(404).json({
        status: 400,
        success: false,
        message: "User not found",
      });
    }

    const durationMs = Date.now() - apiStart;
    logger.info(`✅ Reporting user fetched successfully in ${durationMs}ms`);

    return res.status(200).json({
      status: 200,
      success: true,
      message: "User fetched successfully",
      data: { user },
    });
  } catch (error) {
    const durationMs = Date.now() - apiStart;
    logger.error("❌ Error in FetchReportingUser", {
      message: error.message,
      stack: error.stack,
      durationMs,
    });

    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred while fetching user",
      error: error.message,
    });
  }
};

/**
 *  ResetPasswordForFirstSignIn of users Data
 */
userController.ResetPasswordForFirstSignIn = async (req, res) => {
  const apiStart = Date.now();
  try {
    const { user_email, password } = req.body;

    // Validate required parameters
    if (!user_email || !password) {
      logger.warn("⚠️ Missing required parameters: user_email or password");
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: user_email and password",
        status: 400,
      });
    }

    logger.info(`🔐 Starting password reset for: ${user_email}`);

    const passwordSalt = await generateSalt();
    const hashedPassword = await hashPassword(password, passwordSalt);

    const user = await userModel.findOneAndUpdate(
      { user_email },
      {
        $set: {
          password: hashedPassword,
          passwordSalt: passwordSalt,
          first_login: false,
        },
      },
      { new: true }
    );

    // If user doesn't exist
    if (!user) {
      logger.warn(`❌ User not found: ${user_email}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    const duration = Date.now() - apiStart;
    logger.info(
      `✅ Password reset successful for ${user_email} in ${duration}ms`
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      status: 200,
    });
  } catch (error) {
    const duration = Date.now() - apiStart;
    logger.error("❌ Error during password reset", {
      error: error.message,
      stack: error.stack,
      duration,
    });

    return res.status(500).json({
      success: false,
      message: "An error occurred while resetting the password",
      error: error.message,
      status: 500,
    });
  }
};

/**
 *  UpdateUserPassword of users Data
 */
userController.UpdateUserPassword = async (req, res) => {
  const apiStart = Date.now();
  try {
    const { organization_id, user_email, new_password } = req.body;

    // Validate required parameters
    if (!organization_id || !user_email || !new_password) {
      logger.warn(
        "⚠️ Missing required parameters: organization_id, user_email, or new_password"
      );
      return res.status(400).json({
        success: false,
        message:
          "Missing required parameters: organization_id, user_email, or new_password",
        status: 400,
      });
    }

    logger.info(
      `🔐 Starting password update for ${user_email} in organization ${organization_id}`
    );

    let passwordSalt = await generateSalt();
    let hashedPassword = await hashPassword(new_password, passwordSalt);

    const user = await userModel.findOneAndUpdate(
      { organization_id, user_email },
      {
        $set: {
          password: hashedPassword,
          passwordSalt: passwordSalt,
        },
      },
      { new: true }
    );

    // If user doesn't exist
    if (!user) {
      logger.warn(
        `❌ User not found: ${user_email} in organization ${organization_id}`
      );
      return res.status(404).json({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    const duration = Date.now() - apiStart;
    logger.info(
      `✅ Password updated successfully for ${user_email} in organization ${organization_id} in ${duration}ms`
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      status: 200,
    });
  } catch (error) {
    const duration = Date.now() - apiStart;
    logger.error("❌ Error during password update", {
      error: error.message,
      stack: error.stack,
      duration,
    });

    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the password",
      error: error.message,
      status: 500,
    });
  }
};

function toCamelCase(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

userController.ImportUsers = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let userInMb = "";

  try {
    const users = req.body.users; // Assume the users are sent in the request body as an array
    // const organization_id = req.body.organization_id; // Organization ID can be common for all users
    let userAlreadyExistsInOrg = false;
    let emailIdAlreadyExistsInReadpro = false;
    let NoCheck = true;
    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No users provided to Import",
      });
    }

    let bulkUsersToImport = [];
    let bulkUsersAuthorizationToImport = [];

    for (let user of users) {
      const { user_email, contact_no, employee_id, profile, organization_id } =
        user;

      let password = "";
      password = generateDefaultPassword(user);
      // if (user.user_first_name.length < 4) {
      //  if(user.user_last_name.length <4){
      //   password= user.user_first_name.toUpperCase()+ user.user_last_name.toUpperCase()+"@"+ contact_no.toString().slice(0, 4);
      //    if(password.length<8){
      //     password=user_email.slice(0,8-password.length).toUpperCase()+password;
      //    }
      //  }else{
      //   password =
      //     user.user_first_name.toUpperCase() +
      //     user.user_last_name
      //       .slice(0, 4 - user.user_first_name.length)
      //       .toUpperCase() +
      //     "@" +
      //     contact_no.toString().slice(0, 4);
      //  }

      // } else {
      //   password =
      //     user.user_first_name.slice(0, 4).toUpperCase() +
      //     "@" +
      //     contact_no.toString().slice(0, 4);
      // }
      NoCheck = isMobileNoValid(contact_no);
      console.log("NoCheck", NoCheck);
      if (NoCheck !== true) {
        await session.abortTransaction();
        session.endSession();
        return res.status(200).json({
          success: false,
          message: NoCheck,
        });
      }

      userAlreadyExistsInOrg = await checkUserExistsInOrganization(
        organization_id,
        user_email,
        contact_no,
        employee_id
      );

      let userExists = await userModel.findOne({ user_email });
      if (userExists) {
        emailIdAlreadyExistsInReadpro = true;
      }

      let role = "";
      if (toCamelCase(profile) === "Lead Manager") {
        role = "Lead Manager";
      } else if (toCamelCase(profile) === "Team Lead") {
        role = "Team Lead";
      } else if (toCamelCase(profile) === "Sales") {
        role = "Sales";
      } else if (toCamelCase(profile) === "Operation Manager") {
        role = "Operation Manager";
      }
      console.log("toCamelCase(profile)", toCamelCase(profile));
      console.log("role", role);
      let passwordSalt = await generateSalt();
      let hashedPassword = await hashPassword(password, passwordSalt);
      let uid = new ObjectId();
      // Fetch city and country from organization
      const organization = await organizationModel.findOne({
        organization_id: user.organization_id,
      });
      if (!organization) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: "Organization not found",
        });
      }

      const { city, country, oid } = organization; // Extract city and country

      const existingUserAuthorization = await userAuthorizationModel
        .findOne({
          organization_id: organization_id,
          uid: profile,
        })
        .session(session);

      if (existingUserAuthorization) {
        let userAuth = {
          uid: uid,
          organization_id: organization_id,
          contact_transfer_approved:
            existingUserAuthorization.contact_transfer_approved,
          contact_mass_update_approved:
            existingUserAuthorization.contact_mass_update_approved,
          contact_delete_record_approved:
            existingUserAuthorization.contact_delete_record_approved,
          contact_import_approved:
            existingUserAuthorization.contact_import_approved,
          contact_export_approved:
            existingUserAuthorization.contact_export_approved,
          contact_create_approved:
            existingUserAuthorization.contact_create_approved,
          contact_update_approved:
            existingUserAuthorization.contact_update_approved,
          contact_change_lead_stage_approved:
            existingUserAuthorization.contact_change_lead_stage_approved,
          contact_attachments_create_approved:
            existingUserAuthorization.contact_attachments_create_approved,
          contact_attachments_delete_approved:
            existingUserAuthorization.contact_attachments_delete_approved,
          contact_notes_create_approved:
            existingUserAuthorization.contact_notes_create_approved,
          contact_call_log_create_approved:
            existingUserAuthorization.contact_call_log_create_approved,
          task_export_approved: existingUserAuthorization.task_export_approved,
          project_import_approved:
            existingUserAuthorization.project_import_approved,
          project_export_approved:
            existingUserAuthorization.project_export_approved,
          project_delete_approved:
            existingUserAuthorization.project_delete_approved,
          project_create_approved:
            existingUserAuthorization.project_create_approved,
          project_update_approved:
            existingUserAuthorization.project_update_approved,
          project_attachments_create_approved:
            existingUserAuthorization.project_attachments_create_approved,
          project_attachments_delete_approved:
            existingUserAuthorization.project_attachments_delete_approved,
          calllog_export_approved:
            existingUserAuthorization.calllog_export_approved,
          api_export_approved: existingUserAuthorization.api_export_approved,
          lead_distribution_create_approved:
            existingUserAuthorization.lead_distribution_create_approved,
          lead_distribution_update_approved:
            existingUserAuthorization.lead_distribution_update_approved,
          lead_distribution_delete_approved:
            existingUserAuthorization.lead_distribution_delete_approved,
          faq_create_approved: existingUserAuthorization.faq_create_approved,
          faq_update_approved: existingUserAuthorization.faq_update_approved,
          faq_delete_approved: existingUserAuthorization.faq_delete_approved,
          show_subscription_panel:
            existingUserAuthorization.show_subscription_panel,
          resource_create_approved:
            existingUserAuthorization.resource_create_approved,
          resource_update_approved:
            existingUserAuthorization.resource_update_approved,
          resource_delete_approved:
            existingUserAuthorization.resource_delete_approved,
        };
        bulkUsersAuthorizationToImport.push(userAuth);
      }

      if (oid) {
        userInMb = await createUsersInMB(
          user.contact_no,
          user.user_email,
          user.user_first_name,
          user.user_last_name,
          city,
          country,
          user.SOID
        );

        if (userInMb === false) {
          await session.abortTransaction();
          session.endSession();
          console.log(`Failed to create user in MB for ${user.user_email}`);
          return res.status(400).json({
            success: false,
            message: `Failed to create users`,
          });
        }
      }

      let userData = {
        contact_no: user.contact_no,
        created_by: user.created_by,
        designation: user.designation,
        branch: user.branch,
        device_id: user.device_id,
        organization_id: user.organization_id,
        profile: toCamelCase(user.profile),
        reporting_to: user.reporting_to,
        status: user.status,
        team: user.team,
        uid: uid,
        user_email: user.user_email,
        user_first_name: user.user_first_name,
        user_image: user.user_image,
        user_last_name: user.user_last_name,
        branchPermission: user.branchPermission,
        leadView: user.leadView,
        group_head_name: user.group_head_name,
        employee_id: user.employee_id,
        password: hashedPassword,
        passwordSalt: passwordSalt,
        role: role,
        first_login: true,
        user_oid: req.body.OID ? req.body.OID : userInMb,
        user_super_oid: user.SOID ? user.SOID : "",
      };

      console.log("userData", userData);
      bulkUsersToImport.push(userData);
    }

    if (userAlreadyExistsInOrg) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "A user already exists in Organization",
        error: "A user already exists in Organization",
      });
    }

    if (emailIdAlreadyExistsInReadpro) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "An Email Id already exists",
        error: "An Email Id already exists",
      });
    }

    let bulkUsers = await userModel.insertMany(bulkUsersToImport, { session });
    let bulkAuthorization = await userAuthorizationModel.insertMany(
      bulkUsersAuthorizationToImport,
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      success: true,
      message: "Users imported successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return res.status(400).json({
      success: false,
      message: "An error occurred, Users could not be imported",
      error: error.message,
    });
  }
};

userController.CreateSubUser = async (req, res) => {
  try {
    const {
      user_email,
      user_mobile,
      user_oid,
      user_first_name,
      user_last_name,
      user_super_oid,
    } = req.body;
    // const { admin, organization_id } = req.body;  // Assuming admin and organization_id are passed in the request body

    let OrganizationData;
    OrganizationData = await organizationModel.findOne({ oid: user_super_oid });

    let orgId = OrganizationData.organization_id;

    let userCount = await userModel.countDocuments({ orgId });

    if (userCount >= OrganizationData.no_of_employees) {
      return res.status(200).json({
        success: false,
        message: `User limit reached. Maximum allowed users are ${no_of_licenses}.`,
        error: `User limit reached. Maximum allowed users are ${no_of_licenses}.`,
      });
    }

    // Check if the user already exists in ReadPro
    let userAlreadyExistsInReadpro = await userModel.findOne({ user_email });

    let userNoAlreadyExistsInReadpro = await userModel.findOne({
      contact_no: user_mobile,
    });

    if (userNoAlreadyExistsInReadpro || userAlreadyExistsInReadpro) {
      return res.status(200).json({
        success: false,
        message: "User already exists",
        error: "User already exists",
      });
    }

    // Generate password based on the given logic
    let password = "";

    const mobileDigits = user_mobile.toString().slice(0, 4);
    if (user_first_name.length >= 4) {
      password = user_first_name.slice(0, 4).toUpperCase();
    } else {
      password = user_first_name.toUpperCase();
      if (user_last_name) {
        password += user_last_name
          .slice(0, 4 - user_first_name.length)
          .toUpperCase();
      }
      while (password.length < 4) {
        password += "0";
      }
    }
    password += "@" + mobileDigits;

    // Hash the password
    let passwordSalt = await generateSalt();
    let hashedPassword = await hashPassword(password, passwordSalt);
    let uid = new ObjectId();
    let admin_name =
      OrganizationData.admin_first_name + OrganizationData.admin_last_name;

    // Create the new user
    const newUser = await userModel.create({
      contact_no: user_mobile,
      created_by: admin_name,
      designation: "Sales",
      branch: "",
      device_id: "",
      organization_id: OrganizationData.organization_id,
      profile: "Sales",
      reporting_to: OrganizationData.admin_email_id,
      status: "ACTIVE",
      team: "",
      uid: uid,
      user_email: user_email,
      user_first_name: user_first_name,
      user_image: "",
      user_last_name: user_last_name || "",
      branchPermission: "",
      leadView: "",
      group_head_name: admin_name,
      employee_id: "",
      password: hashedPassword,
      passwordSalt: passwordSalt,
      role: "Sales",
      first_login: true,
      user_oid: user_oid,
      user_super_oid: user_super_oid,
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.log("Error in sub-user creation:", error);
    return res.status(200).json({
      success: false,
      message: "An error occurred, Please try again",
    });
  }
};

userController.SendOtpBeforeUpdatingMobile = async (req, res) => {
  try {
    const { oldMobile, mobileIsd, newMobile } = req.body;
    let sendOtpUrl = MB_URL + "/userauthapi/otp/validate-mobile";
    let sendOtpBody = {
      mobile: oldMobile,
      mobileIsd: mobileIsd,
      newMobile: newMobile,
    };

    const response = await axios.post(sendOtpUrl, sendOtpBody);
    if (response.data.Status == "Success") {
      let rfnum = encryptPAN(JSON.stringify(response.data.mobile.userId));
      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        data: {
          rfnum,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.Desc,
        error: response.data.Desc,
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

userController.VerifyOtpAndUpdateUser = async (req, res) => {
  try {
    const {
      rfnum,
      oldMobile,
      mobileIsd,
      oldMobileOtp,
      newMobile,
      newMobileOtp,
      organization_id,
      uid,
      user_email,
      contact_no,
      employee_id,
    } = req.body;
    const decryptedRfNum = decryptPAN(rfnum);
    let verifyOtpUrl = MB_URL + "/userauthapi/otp/update-mobile";
    let verifyOtpBody = {
      rfnum: decryptedRfNum,
      mobile: oldMobile,
      mobileIsd: mobileIsd,
      otp: oldMobileOtp,
      newMobile: newMobile,
      otpNewMobile: newMobileOtp,
    };

    const response = await axios.post(verifyOtpUrl, verifyOtpBody);
    let oldMobileOtpVerified = response?.data?.mobile?.otpVerifyStatus
      ? response.data.mobile.otpVerifyStatus
      : false;
    let newMobileOtpVerified = response?.data?.newMobile?.otpVerifyStatus
      ? response.data.newMobile.otpVerifyStatus
      : false;
    if (oldMobileOtpVerified && newMobileOtpVerified) {
      let updateData = req.body.data;
      let role = "";
      if (updateData.profile) {
        if (updateData.profile === "Lead Manager") {
          role = "Lead Manager";
          updateData = {
            ...updateData,
            role,
          };
        } else if (updateData.profile === "Team Lead") {
          role = "Team Lead";
          updateData = {
            ...updateData,
            role,
          };
        } else if (updateData.profile === "Sales") {
          role = "Sales";
          updateData = {
            ...updateData,
            role,
          };
        } else if (updateData.profile === "Operation Manager") {
          role = "Operation Manager";
          updateData = {
            ...updateData,
            role,
          };
        }
      }

      if (!organization_id || !uid) {
        return res.status(400).json({
          success: false,
          message: "Missing required parameters",
        });
      }

      if (updateData.contact_no || updateData.employee_id) {
        let userAlreadyExistsInOrg = await checkUserExistsInOrganization(
          organization_id,
          user_email,
          updateData.contact_no,
          updateData.employee_id
        );
        if (userAlreadyExistsInOrg) {
          return res.status(400).json({
            success: false,
            message: "User already exists",
          });
        }
      }

      const user = await userModel.findOneAndUpdate(
        { organization_id, uid },
        { $set: updateData },
        { new: true }
      );
      return res.status(200).json({
        success: true,
        message: "User updated successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "OTP verification failed, Please try again",
        error: "OTP verification failed, Please try again",
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

userController.verifyNumberInDb = async (req, res) => {
  try {
    const { newContactNum } = req.query;

    if (!newContactNum) {
      return res.status(200).json({
        success: false,
        message: "newContactNum does not exist",
        error: "newContactNum doesn't exist",
      });
    }

    const existingContact = await userModel.findOne({
      contact_no: newContactNum,
    });
    if (existingContact) {
      return res.status(200).json({
        success: false,
        message: "New contact number already exists",
        error: "Contact number already in use",
      });
    } else {
      return res.status(200).json({
        success: true,
        message: "number validation successfully",
      });
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

userController.updateContactNumberFromMB = async (req, res) => {
  try {
    const { newContactNum, oldContactNum, userId } = req.body;

    // Validate if the user exists
    const user = await userModel.findOne({ user_oid: userId }).lean();
    if (!user) {
      return res.status(200).json({
        success: false,
        message: "User does not exist",
        error: "user_oid doesn't exist",
      });
    }

    // Check if the old contact number matches the current one in the database
    if (user.contact_no !== oldContactNum) {
      return res.status(200).json({
        success: false,
        message: "Old contact number does not match",
        error: "The old contact number doesn't match the record",
      });
    }

    // Update contact number
    await userModel.findByIdAndUpdate(
      { _id: user._id },
      { $set: { contact_no: newContactNum } }
    );

    return res.status(200).json({
      success: true,
      message: "Contact number updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred, please try again",
      error: error.message,
    });
  }
};

module.exports = userController;
