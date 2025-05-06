const express = require("express");
const storeSMSController = require("../controllers/storeSMSController");
var router = express.Router();

const { storeSMS } = storeSMSController;

router.post("/storeSMS", storeSMS);


module.exports = router;
