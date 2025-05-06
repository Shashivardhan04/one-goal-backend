const express = require('express');
const apiDataController = require('../controllers/apiDataController');
var router = express.Router();

const { FetchAll, FilterValues, CreateAPILead, CreateAPILeadWithoutToken } = apiDataController;

router.get('/fetchAll', FetchAll);

router.get('/filterValues', FilterValues);

router.post('/createAPILead', CreateAPILead);

router.post('/createAPILeadWithoutToken', CreateAPILeadWithoutToken);

module.exports = router;
