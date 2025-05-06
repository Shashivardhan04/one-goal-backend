const express = require('express');
const constantController = require("../controllers/constController");
var router = express.Router();

const { fetch } = constantController;


router.get("/fetchConstant", fetch);


module.exports = router;