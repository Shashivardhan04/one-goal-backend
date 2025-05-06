const express = require('express');
const integrationsController = require('../controllers/integrationsController');
var router = express.Router();

const { CreateIntegration, GetGoogleSheetData, FetchAll, UpdateIntegration, DeleteIntegration, ChangeIntegrationStatus,Update,Delete,GetFBFormFields } = integrationsController;

router.post('/createIntegration', CreateIntegration);

router.post('/getGoogleSheetData', GetGoogleSheetData);

router.get('/fetchAll', FetchAll);

router.post('/update', Update);

router.post('/delete', Delete);

router.post('/pause', ChangeIntegrationStatus);

router.post('/getFBFormFields', GetFBFormFields);

module.exports = router;
