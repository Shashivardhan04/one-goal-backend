const express = require("express");
const userController = require("../controllers/usersController");
var router = express.Router();
//router.get('/', userController.createUser);

const {
  Insert,
  findByOrgan_ID,
  FindByUid,
  updateData,
  GetUser,
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

router.get("/", (req, res) => res.send("you are in users"));

router.post("/newUser", Insert);

router.post("/findByOrganizationId", findByOrgan_ID);

router.post("/updateData", updateData);

router.post("/getUsersList", GetUsersList);

router.post("/updateUserRating", UpdateUserRating);

router.post("/getUserReport", GetUserReport);

router.post("/fetchSpecificData", fetchSpecificData);

router.post("/getUserDetail", getUserDetail);

router.post("/createUserWithAuth", createUserWithAuth);

router.post("/update", Update);

router.get("/fetchAll", FetchAll);

router.get("/fetchUser", FetchUser);

router.get("/fetchReportingUser", FetchReportingUser);

router.post("/resetPasswordForFirstSignIn", ResetPasswordForFirstSignIn);

router.post("/updateUserPassword", UpdateUserPassword);

router.post("/importUsers", ImportUsers);

router.post("/createSubUser", CreateSubUser);

router.post("/sendOtpBeforeUpdatingMobile", SendOtpBeforeUpdatingMobile);

router.post("/verifyOtpAndUpdateUser", VerifyOtpAndUpdateUser);

router.post("/updateUserContactMMB", updateContactNumberFromMB);

router.get("/verifyNum", verifyNumberInDb);

module.exports = router;
