const express = require('express');
const subscriptionDetailsController = require('../controllers/subscriptionDetailsController');
var router = express.Router();

const {
  updateSubscriptionDetails,
} = subscriptionDetailsController;


router.post('/updateSubscriptionDetails', updateSubscriptionDetails);

module.exports = router;

