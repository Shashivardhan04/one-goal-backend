const express = require("express");
const autoRotationController = require("../controllers/autoRotationController")
var router = express.Router();
//router.get('/', userController.createUser);

const {autoRotateLeads} =
autoRotationController;

router.post("/autoRotateLeads", autoRotateLeads);


module.exports = router;
