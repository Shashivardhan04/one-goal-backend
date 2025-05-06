const express = require('express');
const apiTokenController = require('../controllers/apiTokenController');
var router = express.Router();

const { Create, Update, FetchAll, FetchToken, FilterValues } = apiTokenController;

router.get('/fetchAll', FetchAll);

router.post('/create', Create);

router.put('/update', Update);

router.get('/fetchOne', FetchToken);

// router.delete('/delete', FetchToken);

router.get('/filterValues', FilterValues);

module.exports = router;
