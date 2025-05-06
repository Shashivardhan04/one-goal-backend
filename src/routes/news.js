const express = require('express');
const newsController = require('../controllers/newsController');
var router = express.Router();

const { Insert, Update, FetchAll } = newsController;

router.get('/fetchAll', FetchAll);

router.post('/create', Insert);

router.post('/update', Update);

module.exports = router;
