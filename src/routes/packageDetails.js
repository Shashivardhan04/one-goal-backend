const express = require('express');
const packageDetailsController = require("../controllers/packageDetailsController")
var router = express.Router();

const {fetchAll, OrgHadCallRecordingSubscription, 
    // FetchAllV2
}=packageDetailsController;

router.get("/fetchAll",fetchAll);

router.get("/orgHadCallRecordingSubscription",OrgHadCallRecordingSubscription);

// router.get("/fetchAllV2",FetchAllV2);


module.exports = router;