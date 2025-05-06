const express = require('express');
const fbWebhooksController = require('../controllers/fbWebhooksController.js');
var router = express.Router();

const { FBGetWebhook,FBPostWebhook } = fbWebhooksController;

router.get('/fbWebhook', FBGetWebhook);

router.post('/fbWebhook', FBPostWebhook);

module.exports = router;