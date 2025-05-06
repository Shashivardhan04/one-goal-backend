const express = require('express');
const router = express.Router();
const { addQuery, getQueries } = require('../controllers/queryController');

router.get('/getqueries', getQueries); //For Frontend
router.post('/addQuery', addQuery);

module.exports = router;
