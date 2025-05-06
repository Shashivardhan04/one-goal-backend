const express = require('express');
const faqController = require('../controllers/faqController');
var router = express.Router();

const { Create, Update, FetchAll, Delete } = faqController;

router.get('/fetchAll', FetchAll);

router.post('/create', Create);

router.put('/update', Update);

router.post('/delete', Delete);


module.exports = router;
