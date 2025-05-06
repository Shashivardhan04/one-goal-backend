const express = require('express');
const smsController = require('../controllers/smsController');
var router = express.Router();

const { addSmsServiceData, triggerSMS, getOrganizationSms } = smsController;

router.post('/add', addSmsServiceData);

router.post('/sendSms', triggerSMS);

router.post('/', getOrganizationSms);

module.exports = router;
