const express = require('express');
const dataTransferController = require('../controllers/dataTransferController');
var router = express.Router();

const { transferProjects, transferProjectResources,transferProjectUploadRequests,transferContactUploadRequests,transferApiTokens, transferFaq, transferAPIData } = dataTransferController;

router.post('/transferProjects', transferProjects);

router.post('/transferProjectResources', transferProjectResources);

router.post('/transferProjectUploadRequests', transferProjectUploadRequests);

router.post('/transferContactUploadRequests', transferContactUploadRequests);

router.post('/transferApiTokens', transferApiTokens);

router.post('/transferFaq', transferFaq);

router.post('/transferAPIData', transferAPIData);

module.exports = router;
