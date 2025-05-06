const express = require('express');
const ivrController = require('../controllers/ivrContoller');
var router = express.Router();

const { soilSearchIvrInsert } = ivrController;

router.get('/soilSearch', soilSearchIvrInsert);

module.exports = router;
