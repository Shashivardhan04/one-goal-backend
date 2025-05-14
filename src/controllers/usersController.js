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

/**
 *  ImportUsers of users Data
 */

const toCamelCase = (str) =>
  str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

userController.ImportUsers = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const apiStart = Date.now();
  let userInMb = "";

  try {
    const users = req.body.users;
    if (!Array.isArray(users) || users.length === 0) {
      logger.warn("⚠️ No users provided to import");
      return res.status(400).json({
        success: false,
        message: "No users provided to import",
        status: 400,
      });
    }

    let bulkUsersToImport = [];
    let bulkUsersAuthorizationToImport = [];

    for (const user of users) {
      const { user_email, contact_no, employee_id, profile, organization_id } =
        user;

      const password = generateDefaultPassword(user);
      const isValidMobile = isMobileNoValid(contact_no);
      if (isValidMobile !== true) {
        await session.abortTransaction();
        session.endSession();
        logger.warn("❌ Invalid mobile number", { contact_no });
        return res.status(400).json({
          success: false,
          message: isValidMobile,
          status: 400,
        });
      }

      const userAlreadyExists = await checkUserExistsInOrganization(
        organization_id,
        user_email,
        contact_no,
        employee_id
      );
      if (userAlreadyExists) {
        await session.abortTransaction();
        session.endSession();
        logger.warn("❌ User already exists in organization", { user_email });
        return res.status(409).json({
          success: false,
          message: "A user already exists in Organization",
          status: 409,
        });
      }

      const existingEmail = await userModel.findOne({ user_email });
      if (existingEmail) {
        await session.abortTransaction();
        session.endSession();
        logger.warn("❌ Email already exists in Readpro", { user_email });
        return res.status(409).json({
          success: false,
          message: "An Email Id already exists",
          status: 409,
        });
      }

      const role = [
        "Lead Manager",
        "Team Lead",
        "Sales",
        "Operation Manager",
      ].includes(toCamelCase(profile))
        ? toCamelCase(profile)
        : "";

      const passwordSalt = await generateSalt();
      const hashedPassword = await hashPassword(password, passwordSalt);
      const uid = new ObjectId();

      const organization = await organizationModel.findOne({ organization_id });
      if (!organization) {
        await session.abortTransaction();
        session.endSession();
        logger.warn("❌ Organization not found", { organization_id });
        return res.status(404).json({
          success: false,
          message: "Organization not found",
          status: 404,
        });
      }

      const { city, country, oid } = organization;

      const existingAuth = await userAuthorizationModel
        .findOne({
          organization_id,
          uid: profile,
        })
        .session(session);

      if (existingAuth) {
        const userAuth = { uid, organization_id };
        Object.assign(userAuth, existingAuth.toObject());
        delete userAuth._id;
        userAuth.uid = uid;
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

        if (!userInMb) {
          await session.abortTransaction();
          session.endSession();
          logger.error("❌ Failed to create user in MB", { user_email });
          return res.status(400).json({
            success: false,
            message: "Failed to create users",
            status: 400,
          });
        }
      }

      const userData = {
        contact_no: user.contact_no,
        created_by: user.created_by,
        designation: user.designation,
        branch: user.branch,
        device_id: user.device_id,
        organization_id,
        profile: toCamelCase(user.profile),
        reporting_to: user.reporting_to,
        status: user.status,
        team: user.team,
        uid,
        user_email,
        user_first_name: user.user_first_name,
        user_image: user.user_image,
        user_last_name: user.user_last_name,
        branchPermission: user.branchPermission,
        leadView: user.leadView,
        group_head_name: user.group_head_name,
        employee_id: user.employee_id,
        password: hashedPassword,
        passwordSalt,
        role,
        first_login: true,
        user_oid: req.body.OID || userInMb,
        user_super_oid: user.SOID || "",
      };

      bulkUsersToImport.push(userData);
    }

    await userModel.insertMany(bulkUsersToImport, { session });
    await userAuthorizationModel.insertMany(bulkUsersAuthorizationToImport, {
      session,
    });

    await session.commitTransaction();
    session.endSession();
    const duration = Date.now() - apiStart;
    logger.info(
      `✅ Imported ${bulkUsersToImport.length} users in ${duration}ms`
    );

    return res.status(201).json({
      success: true,
      message: "Users imported successfully",
      status: 201,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error("❌ Error importing users", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An error occurred, Users could not be imported",
      error: error.message,
      status: 500,
    });
  }
};

/**
 *  CreateSubUser of users Data
 */
userController.CreateSubUser = async (req, res) => {
  logger.info("CreateSubUser API called");

  try {
    const {
      user_email,
      user_mobile,
      user_oid,
      user_first_name,
      user_last_name,
      user_super_oid,
    } = req.body;

    logger.info("Validating request body");
    if (
      !user_email ||
      !user_mobile ||
      !user_oid ||
      !user_first_name ||
      !user_super_oid
    ) {
      logger.warn("Missing required fields in request");
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Missing required fields",
        error: "Missing required fields",
      });
    }

    logger.info(`Fetching organization for super_oid: ${user_super_oid}`);
    const organization = await organizationModel.findOne({
      oid: user_super_oid,
    });

    if (!organization) {
      logger.warn(`Organization not found for super_oid: ${user_super_oid}`);
      return res.status(404).json({
        success: false,
        status: 404,
        message: "Organization not found",
        error: "Invalid super OID provided",
      });
    }

    const orgId = organization.organization_id;
    logger.info(`Organization found. orgId: ${orgId}`);

    logger.info("Counting current users in organization");
    const userCount = await userModel.countDocuments({
      organization_id: orgId,
    });
    const maxUsers = organization.no_of_employees;
    logger.info(`Current user count: ${userCount}, Max allowed: ${maxUsers}`);

    if (userCount >= maxUsers) {
      logger.warn("User limit reached for organization");
      return res.status(409).json({
        success: false,
        status: 409,
        message: `User limit reached. Maximum allowed users are ${maxUsers}.`,
        error: "User limit reached",
      });
    }

    logger.info(
      `Checking if user already exists (email: ${user_email}, mobile: ${user_mobile})`
    );
    const existingUserByEmail = await userModel.findOne({ user_email });
    const existingUserByMobile = await userModel.findOne({
      contact_no: user_mobile,
    });

    if (existingUserByEmail || existingUserByMobile) {
      logger.warn("User with same email or mobile already exists");
      return res.status(409).json({
        success: false,
        status: 409,
        message: "User already exists",
        error: "User with same email or mobile already exists",
      });
    }

    logger.info("Generating password for new user");
    const mobileDigits = user_mobile.toString().slice(0, 4);
    let passwordBase = user_first_name.slice(0, 4).toUpperCase();

    if (user_first_name.length < 4) {
      passwordBase = user_first_name.toUpperCase();
      if (user_last_name) {
        passwordBase += user_last_name
          .slice(0, 4 - passwordBase.length)
          .toUpperCase();
      }
      while (passwordBase.length < 4) {
        passwordBase += "0";
      }
    }

    const generatedPassword = `${passwordBase}@${mobileDigits}`;
    logger.info(`Generated password: ${generatedPassword} (before hashing)`);

    logger.info("Hashing password");
    const passwordSalt = await generateSalt();
    const hashedPassword = await hashPassword(generatedPassword, passwordSalt);

    const uid = new ObjectId();
    const adminName = `${organization.admin_first_name || ""}${
      organization.admin_last_name || ""
    }`;

    logger.info("Creating new user in database");
    await userModel.create({
      contact_no: user_mobile,
      created_by: adminName,
      designation: "Sales",
      branch: "",
      device_id: "",
      organization_id: orgId,
      profile: "Sales",
      reporting_to: organization.admin_email_id,
      status: "ACTIVE",
      team: "",
      uid,
      user_email,
      user_first_name,
      user_image: "",
      user_last_name: user_last_name || "",
      branchPermission: "",
      leadView: "",
      group_head_name: adminName,
      employee_id: "",
      password: hashedPassword,
      passwordSalt,
      role: "Sales",
      first_login: true,
      user_oid,
      user_super_oid,
    });

    logger.info(`User created successfully: ${user_email}`);
    return res.status(201).json({
      success: true,
      status: 201,
      message: "User created successfully",
    });
  } catch (error) {
    logger.error("Error in CreateSubUser:", error);
    return res.status(500).json({
      success: false,
      status: 500,
      message: "An error occurred, Please try again",
      error: error.message,
    });
  }
};

/**
 *  SendOtpBeforeUpdatingMobile of users Data
 */
userController.SendOtpBeforeUpdatingMobile = async (req, res) => {
  logger.info("SendOtpBeforeUpdatingMobile API called");

  try {
    const { oldMobile, mobileIsd, newMobile } = req.body;

    logger.info("Validating request payload");
    if (!oldMobile || !mobileIsd || !newMobile) {
      logger.warn(
        "Missing required fields: oldMobile, mobileIsd, or newMobile"
      );
      return res.status(400).json({
        success: false,
        status: 400,
        message: "Missing required fields",
        error: "Required fields: oldMobile, mobileIsd, newMobile",
      });
    }

    const sendOtpUrl = `${MB_URL}/userauthapi/otp/validate-mobile`;
    const sendOtpBody = {
      mobile: oldMobile,
      mobileIsd,
      newMobile,
    };

    logger.info(`Sending OTP via POST ${sendOtpUrl}`, { sendOtpBody });

    const response = await axios.post(sendOtpUrl, sendOtpBody);

    if (response?.data?.Status === "Success") {
      logger.info("OTP request successful from external API");

      const rfnum = encryptPAN(JSON.stringify(response.data.mobile.userId));

      return res.status(200).json({
        success: true,
        status: 200,
        message: "OTP sent successfully",
        data: { rfnum },
      });
    } else {
      const desc = response?.data?.Desc || "Failed to send OTP";
      logger.warn(`OTP API failed: ${desc}`);

      return res.status(400).json({
        success: false,
        status: 400,
        message: desc,
        error: desc,
      });
    }
  } catch (error) {
    logger.error("Exception in SendOtpBeforeUpdatingMobile:", error);

    const message =
      error.response?.data?.message || error.message || "Unknown error";

    return res.status(500).json({
      success: false,
      status: 500,
      message: "An error occurred, Please try again",
      error: message,
    });
  }
};

/**
 *  VerifyOtpAndUpdateUser of users Data
 */
userController.VerifyOtpAndUpdateUser = async (req, res) => {
  logger.info("VerifyOtpAndUpdateUser API invoked");

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
      data: updateData,
    } = req.body;

    logger.info("Validating required parameters");
    if (
      !rfnum ||
      !oldMobile ||
      !mobileIsd ||
      !oldMobileOtp ||
      !newMobile ||
      !newMobileOtp ||
      !organization_id ||
      !uid
    ) {
      logger.warn("Missing one or more required fields in request body");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameters",
      });
    }

    const decryptedRfNum = decryptPAN(rfnum);

    const verifyOtpUrl = `${MB_URL}/userauthapi/otp/update-mobile`;
    const verifyOtpBody = {
      rfnum: decryptedRfNum,
      mobile: oldMobile,
      mobileIsd,
      otp: oldMobileOtp,
      newMobile,
      otpNewMobile: newMobileOtp,
    };

    logger.info("Sending OTP verification request to mobile auth service", {
      verifyOtpBody,
    });

    const response = await axios.post(verifyOtpUrl, verifyOtpBody);

    const oldMobileOtpVerified =
      response?.data?.mobile?.otpVerifyStatus || false;
    const newMobileOtpVerified =
      response?.data?.newMobile?.otpVerifyStatus || false;

    if (!oldMobileOtpVerified || !newMobileOtpVerified) {
      logger.warn("OTP verification failed", {
        oldMobileOtpVerified,
        newMobileOtpVerified,
      });
      return res.status(400).json({
        status: 400,
        success: false,
        message: "OTP verification failed, Please try again",
        error: "OTP verification failed",
      });
    }

    logger.info("Both OTPs verified successfully");

    // Determine and assign role based on profile
    if (updateData?.profile) {
      const validProfiles = [
        "Lead Manager",
        "Team Lead",
        "Sales",
        "Operation Manager",
      ];
      if (validProfiles.includes(updateData.profile)) {
        updateData.role = updateData.profile;
        logger.info(`Role assigned based on profile: ${updateData.profile}`);
      }
    }

    // Check for duplicate user in organization if necessary fields are changing
    if (updateData.contact_no || updateData.employee_id) {
      logger.info(
        "Checking if updated contact_no or employee_id already exists in org"
      );
      const userAlreadyExists = await checkUserExistsInOrganization(
        organization_id,
        user_email,
        updateData.contact_no,
        updateData.employee_id
      );

      if (userAlreadyExists) {
        logger.warn(
          "User with same contact number or employee ID already exists"
        );
        return res.status(400).json({
          status: 400,
          success: false,
          message: "User already exists",
        });
      }
    }

    // Proceed with updating the user
    logger.info("Updating user with new data", {
      organization_id,
      uid,
      updateData,
    });

    const updatedUser = await userModel.findOneAndUpdate(
      { organization_id, uid },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      logger.error("Failed to update user. No matching record found.");
      return res.status(404).json({
        status: 400,
        success: false,
        message: "User not found or update failed",
      });
    }

    logger.info("User updated successfully", { uid });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    logger.error("Exception in VerifyOtpAndUpdateUser:", error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "An error occurred, Please try again",
      error: error.message || "Unknown error",
    });
  }
};

/**
 *  verifyNumberInDb of users Data
 */
userController.verifyNumberInDb = async (req, res) => {
  logger.info("verifyNumberInDb API called");

  try {
    const { newContactNum } = req.query;

    if (!newContactNum) {
      logger.warn("Missing query param: newContactNum");
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Missing required parameter: newContactNum",
        error: "newContactNum is required",
      });
    }

    logger.info("Checking if contact number exists in database", {
      newContactNum,
    });

    const existingContact = await userModel.exists({
      contact_no: newContactNum,
    });

    if (existingContact) {
      logger.info("Contact number already exists in the database", {
        newContactNum,
      });
      return res.status(200).json({
        status: 200,
        success: false,
        message: "Contact number already exists",
        error: "Contact number already in use",
      });
    }

    logger.info("Contact number is available", { newContactNum });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Contact number is valid and available",
    });
  } catch (error) {
    logger.error("Error in verifyNumberInDb", {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      status: 500,
      success: false,
      message: "An internal error occurred. Please try again.",
      error: error.message,
    });
  }
};

/**
 *  updateContactNumberFromMB of users Data
 */
userController.updateContactNumberFromMB = async (req, res) => {
  logger.info("updateContactNumberFromMB API called");

  try {
    const { newContactNum, oldContactNum, userId } = req.body;

    // Validate request body
    if (!newContactNum || !oldContactNum || !userId) {
      logger.warn("Missing required fields", {
        newContactNum,
        oldContactNum,
        userId,
      });
      return res.status(400).json({
        status: 400,
        success: false,
        message:
          "Missing required fields: newContactNum, oldContactNum, or userId",
        error: "Incomplete input",
      });
    }

    logger.info("Validating if user exists in DB", { userId });

    const user = await userModel.findOne({ user_oid: userId }).lean();

    if (!user) {
      logger.warn("User not found", { userId });
      return res.status(404).json({
        status: 400,
        success: false,
        message: "User not found",
        error: "Invalid user_oid",
      });
    }

    if (user.contact_no !== oldContactNum) {
      logger.warn("Old contact number mismatch", {
        expected: user.contact_no,
        provided: oldContactNum,
      });
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Old contact number does not match",
        error: "Provided old contact number does not match existing record",
      });
    }

    logger.info("Updating contact number", { userId, newContactNum });

    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      { $set: { contact_no: newContactNum } },
      { new: true }
    );

    if (!updatedUser) {
      logger.error("Failed to update contact number", { userId });
      return res.status(500).json({
        status: 500,
        success: false,
        message: "Failed to update contact number",
        error: "Database update failed",
      });
    }

    logger.info("Contact number updated successfully", { userId });
    return res.status(200).json({
      status: 200,
      success: true,
      message: "Contact number updated successfully",
    });
  } catch (error) {
    logger.error("Exception in updateContactNumberFromMB", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      status: 500,
      success: false,
      message: "An internal error occurred. Please try again.",
      error: error.message,
    });
  }
};

module.exports = userController;
