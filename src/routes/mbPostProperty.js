const express = require("express");
const mbPostPropertyController = require("../controllers/mbPostPropertyController");
var router = express.Router();

const { BricksDoLoginByType, BricksDoMobileLogin, BrickWapPropertyDetails, MMBMobileResponses, BricksFindBuyerOrSeller, BricksB2BCampaignTracking, MBMobileAPIGetMBPrimePackageDetail, BricksUpdateLeadStatus, MMBMobileCaptureLeadsAction, MMBMobileLogSelfVerifyAction, MMBMobileTopCitiesMaster, MMBMobilePPRecordIntent, GetUserListings, GetSubscriptionMessages, SaveMobTppmtTempData, UpdateMobTppmtTempData, MBMobileCheckPackageAvailability, ValidateQuotient, WapPostProperty,WapPostPropertyPost, MMBMobileProperties, MMBMobileCitiesMaster, MMBMobileLocalitiesMaster, BricksProjectSociety,agentBenifits,getKeywordAutoSuggestListForMobile,getPostProperty,completionScore,validateQuotientForEdit,bricksWapPostProperty } =
    mbPostPropertyController;

// router.post("/wapPropertyDetails", WapPropertyDetails);

// router.post("/myMobileApiMmbResponses", MyMobileApiMmbResponses);

// router.get("/findBuyerOrSeller", FindBuyerOrSeller);

router.post("/bricks/dologinbytype", BricksDoLoginByType);

router.post("/bricks/domobilelogin", BricksDoMobileLogin);

router.get("/bricks/wapPropertyDetails", BrickWapPropertyDetails);

router.get("/mbmobileapi/mmb/responses", MMBMobileResponses);

router.post("/bricks/findBuyerOrSeller", BricksFindBuyerOrSeller);

router.post("/bricks/b2bCampaignTracking", BricksB2BCampaignTracking);

router.get("/mbmobileapi/get-mbprime-package-details", MBMobileAPIGetMBPrimePackageDetail);

router.post("/bricks/updateLeadStatus", BricksUpdateLeadStatus);

router.get("/mbmobileapi/mmb/captureLeadsAction", MMBMobileCaptureLeadsAction);

router.post("/mbmobileapi/logselfverifyaction", MMBMobileLogSelfVerifyAction);

router.get("/mbmobileapi/master/top-cities", MMBMobileTopCitiesMaster);

router.post("/mbmobileapi/pp/record-intent", MMBMobilePPRecordIntent);

router.post("/postproperty/getUserListing", GetUserListings);

router.post("/postproperty/getSubscriptionMessages", GetSubscriptionMessages);

router.get("/postproperty/saveMobTppmtTempData", SaveMobTppmtTempData);

router.get("/postproperty/updateMobTppmtTempData", UpdateMobTppmtTempData);

router.get("/mbmobileapi/check-package-availability", MBMobileCheckPackageAvailability);

router.get("/postproperty/validateQuotient", ValidateQuotient);

router.get("/postproperty/wapPostProperty", WapPostProperty);

router.post("/postproperty/wapPostPropertyPost", WapPostPropertyPost);

router.get("/mbmobileapi/mmb/properties", MMBMobileProperties);

router.get("/mbmobileapi/master/cities", MMBMobileCitiesMaster);

router.get("/mbmobileapi/master/localities", MMBMobileLocalitiesMaster);

router.get("/bricks/projectSociety", BricksProjectSociety);

router.get("/mbmobileapi/mmb/agentBenifits",agentBenifits);

router.get("/ajax/getKeywordAutoSuggestListForMobile",getKeywordAutoSuggestListForMobile)

router.get("/postproperty/getPostProperty",getPostProperty)

router.get("/postproperty/completionScore",completionScore)

router.get("/postproperty/validateQuotientForEdit",validateQuotientForEdit)

router.get("/bricks/wapPostProperty",bricksWapPostProperty)

// router.post("/update");

module.exports = router;
