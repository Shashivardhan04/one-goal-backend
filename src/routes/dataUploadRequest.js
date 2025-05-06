const express = require('express');
const dataUploadRequestController = require('../controllers/dataUploadRequestController');
var router = express.Router();

const { FetchAll,UploadContacts,UploadProjects } = dataUploadRequestController;

router.get('/fetchAll', FetchAll);

router.post('/uploadContacts', UploadContacts);

router.post('/uploadProjects', UploadProjects);

module.exports = router;
