const express = require('express');
const mbResponsesController = require('../controllers/mbResponsesController');
var router = express.Router();

const {responses,count,propresponses,companyresponses,subuserresponses,fetchLeadByMB} = mbResponsesController;

router.post("/responses",responses)

router.post("/count",count)

router.post("/propresponses",propresponses)

router.post("/companyresponses",companyresponses)

router.post("/subuserresponses",subuserresponses)

router.get("/fetchLeadByMB",fetchLeadByMB)

module.exports = router;
