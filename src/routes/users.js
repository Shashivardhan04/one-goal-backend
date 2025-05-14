const express = require("express");
const logger = require("../services/logger"); // Ensure correct path to your logger file
const userController = require("../controllers/usersController");
const router = express.Router();

// Destructure controller functions for cleaner usage
const {
  Insert,
  GetUser,
  findByOrgan_ID,
  updateData,
  FindByUid,
  GetUsersList,
  UpdateUserRating,
  GetUserReport,
  fetchSpecificData,
  getUserDetail,
  createUserWithAuth,
  Update,
  FetchAll,
  FetchUser,
  ResetPasswordForFirstSignIn,
  UpdateUserPassword,
  FetchReportingUser,
  ImportUsers,
  CreateSubUser,
  SendOtpBeforeUpdatingMobile,
  VerifyOtpAndUpdateUser,
  updateContactNumberFromMB,
  verifyNumberInDb,
} = userController;

/**
 * Utility function to handle async routes gracefully while ensuring logging at all stages.
 */
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    logger.info(`🚀 ${req.method} ${req.url} - Processing request`);
    await fn(req, res);
    logger.info(`✅ ${req.method} ${req.url} - Success`);
  } catch (error) {
    logger.error(`❌ ${req.method} ${req.url} - Error: ${error.message}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * 🧪 Test Route
 */
router.get("/", (req, res) => {
  logger.info("🟢 /users - Test route hit");
  res.send("You are in users");
});

/**
 * 👤 Create a new user
 */
router.post("/newUser", asyncHandler(Insert));

/**
 * 🔍 Fetch user based on query parameters
 */
router.get("/getUser", asyncHandler(GetUser));

/**
 * 🔎 Find users by organization ID
 */
router.get("/findByOrganizationId", asyncHandler(findByOrgan_ID));

/**
 * ✏️ Update user data
 */
router.put("/updateData", asyncHandler(updateData));

/**
 * 🆔 Find user by UID
 */
router.get("/findByUID", asyncHandler(FindByUid));

/**
 * 📄 Fetch list of all users
 */
router.get("/getUsersList", asyncHandler(GetUsersList));

/**
 * ⭐ Update user rating
 */
router.put("/updateUserRating", asyncHandler(UpdateUserRating));

/**
 * 📊 Generate a user report
 */
router.get("/getUserReport", asyncHandler(GetUserReport));

/**
 * 🔍 Fetch specific user-related data
 */
router.get("/fetchSpecificData", asyncHandler(fetchSpecificData));

/**
 * 📋 Get user detail
 */
router.get("/getUserDetail", asyncHandler(getUserDetail));

/**
 * 🔐 Create user with authentication
 */
router.post("/createUserWithAuth", asyncHandler(createUserWithAuth));

/**
 * 🔄 Update an existing user record
 */
router.put("/update", asyncHandler(Update));

/**
 * 📦 Fetch all users
 */
router.get("/fetchAll", asyncHandler(FetchAll));

/**
 * 🔍 Fetch single user
 */
router.get("/fetchUser", asyncHandler(FetchUser));

/**
 * 📑 Get users under reporting structure
 */
router.get("/fetchReportingUser", asyncHandler(FetchReportingUser));

/**
 * 🔒 Reset password for first-time sign-in users
 */
router.post(
  "/resetPasswordForFirstSignIn",
  asyncHandler(ResetPasswordForFirstSignIn)
);

/**
 * 🔑 Update user password
 */
router.post("/updateUserPassword", asyncHandler(UpdateUserPassword));

/**
 * 📤 Bulk import users
 */
router.post("/importUsers", asyncHandler(ImportUsers));

/**
 * 👥 Create a sub-user under a parent user
 */
router.post("/createSubUser", asyncHandler(CreateSubUser));

/**
 * 📲 Send OTP before updating mobile number
 */
router.post(
  "/sendOtpBeforeUpdatingMobile",
  asyncHandler(SendOtpBeforeUpdatingMobile)
);

/**
 * ✅ Verify OTP and update user contact details
 */
router.post("/verifyOtpAndUpdateUser", asyncHandler(VerifyOtpAndUpdateUser));

/**
 * 🔄 Update contact number from Mobile Modification Base (MMB)
 */
router.post("/updateUserContactMMB", asyncHandler(updateContactNumberFromMB));

/**
 * 🕵️ Verify mobile number in the database
 */
router.get("/verifyNum", asyncHandler(verifyNumberInDb));

module.exports = router;
