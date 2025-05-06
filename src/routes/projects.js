const express = require('express');
const projectsController = require('../controllers/projectsController');
var router = express.Router();

const { Create, Update, FetchAll, Delete, FilterValues,FetchAllProjects } = projectsController;

router.get('/fetchAll', FetchAll);

router.get('/fetchAllProjects', FetchAllProjects);

router.post('/create', Create);

router.put('/update', Update);

// router.get('/fetchOne', FetchToken);

router.post('/delete', Delete);

router.get('/filterValues', FilterValues);

module.exports = router;
