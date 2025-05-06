const express = require('express');
const notificationContentController = require("../controllers/notificationContentController")
var router = express.Router();

const { notificationContent } = notificationContentController;

router.post("/notificationContent",notificationContent)

module.exports = router;