const express = require("express");
const userAuthorizationController = require("../controllers/userAuthorizationController");
var router = express.Router();

const { fetchUserAuthorization, updateUserAuthorization } =
  userAuthorizationController;

router.get("/get", fetchUserAuthorization);

router.post("/update", updateUserAuthorization);

module.exports = router;
