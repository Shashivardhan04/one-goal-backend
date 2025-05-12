const express = require("express");
const logger = require("../services/logger"); // ensure correct path to your logger file
const userController = require("../controllers/usersController");
const router = express.Router();

// Destructure controller functions
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

// 🧪 Test route
router.get("/", (req, res) => {
  logger.info("🟢 /users - Hit test route");
  res.send("you are in users");
});

// 👤 Create a new user
router.post("/newUser", (req, res, next) => {
  logger.info("📩 /newUser - Creating new user");
  Insert(req, res, next);
});

// 🔍 Fetch user based on filters or input
router.get("/getUser", (req, res, next) => {
  logger.info("🔍 /getUser - Fetching user based on query parameters");
  GetUser(req, res, next);
});

// 🔍 Find users by organization ID
router.get("/findByOrganizationId", (req, res, next) => {
  logger.info("🔎 /findByOrganizationId - Searching users by organization");
  findByOrgan_ID(req, res, next);
});

// ✏️ Update user data
router.put("/updateData", (req, res, next) => {
  logger.info("✏️ /updateData - Updating user data");
  updateData(req, res, next);
});

// 🆔 Find user by UID
router.get("/findByUID", (req, res, next) => {
  logger.info("🆔 /findByUID - Finding user by UID");
  FindByUid(req, res, next);
});

// 📄 Get a list of users
router.post("/getUsersList", (req, res, next) => {
  logger.info("📄 /getUsersList - Fetching users list");
  GetUsersList(req, res, next);
});

// ⭐ Update user rating
router.post("/updateUserRating", (req, res, next) => {
  logger.info("⭐ /updateUserRating - Updating user rating");
  UpdateUserRating(req, res, next);
});

// 📊 Generate user report
router.post("/getUserReport", (req, res, next) => {
  logger.info("📊 /getUserReport - Generating user report");
  GetUserReport(req, res, next);
});

// 🔍 Fetch specific user data
router.post("/fetchSpecificData", (req, res, next) => {
  logger.info("🔍 /fetchSpecificData - Fetching specific user data");
  fetchSpecificData(req, res, next);
});

// 📋 Get user detail
router.post("/getUserDetail", (req, res, next) => {
  logger.info("📋 /getUserDetail - Fetching user detail");
  getUserDetail(req, res, next);
});

// 🔐 Create user with authentication
router.post("/createUserWithAuth", (req, res, next) => {
  logger.info("🔐 /createUserWithAuth - Creating user with auth");
  createUserWithAuth(req, res, next);
});

// 🔄 Update a user record
router.post("/update", (req, res, next) => {
  logger.info("🔄 /update - Updating user record");
  Update(req, res, next);
});

// 📦 Fetch all users
router.get("/fetchAll", (req, res, next) => {
  logger.info("📦 /fetchAll - Fetching all users");
  FetchAll(req, res, next);
});

// 🔍 Fetch single user
router.get("/fetchUser", (req, res, next) => {
  logger.info("👤 /fetchUser - Fetching one user");
  FetchUser(req, res, next);
});

// 📑 Get users under reporting structure
router.get("/fetchReportingUser", (req, res, next) => {
  logger.info("📑 /fetchReportingUser - Fetching reporting users");
  FetchReportingUser(req, res, next);
});

// 🔒 First sign-in password reset
router.post("/resetPasswordForFirstSignIn", (req, res, next) => {
  logger.info(
    "🔒 /resetPasswordForFirstSignIn - Resetting password for first sign-in"
  );
  ResetPasswordForFirstSignIn(req, res, next);
});

// 🔑 Update password for user
router.post("/updateUserPassword", (req, res, next) => {
  logger.info("🔑 /updateUserPassword - Updating user password");
  UpdateUserPassword(req, res, next);
});

// 📤 Import users in bulk
router.post("/importUsers", (req, res, next) => {
  logger.info("📤 /importUsers - Importing users");
  ImportUsers(req, res, next);
});

// 👥 Create sub-user under a parent user
router.post("/createSubUser", (req, res, next) => {
  logger.info("👥 /createSubUser - Creating sub-user");
  CreateSubUser(req, res, next);
});

// 📲 Send OTP before updating mobile
router.post("/sendOtpBeforeUpdatingMobile", (req, res, next) => {
  logger.info(
    "📲 /sendOtpBeforeUpdatingMobile - Sending OTP before mobile update"
  );
  SendOtpBeforeUpdatingMobile(req, res, next);
});

// ✅ Verify OTP and update user contact
router.post("/verifyOtpAndUpdateUser", (req, res, next) => {
  logger.info("✅ /verifyOtpAndUpdateUser - Verifying OTP & updating user");
  VerifyOtpAndUpdateUser(req, res, next);
});

// 🔄 Update contact number from MMB (mobile-based modification)
router.post("/updateUserContactMMB", (req, res, next) => {
  logger.info("🔄 /updateUserContactMMB - Updating contact from MMB");
  updateContactNumberFromMB(req, res, next);
});

// 🕵️ Verify number in database
router.get("/verifyNum", (req, res, next) => {
  logger.info("🕵️ /verifyNum - Verifying mobile number in DB");
  verifyNumberInDb(req, res, next);
});

module.exports = router;
