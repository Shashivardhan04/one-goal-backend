const express = require('express');
const projectResoController = require('../controllers/projectResourcesController');
var router = express.Router();

router.post("/addAttachment",projectResoController.AddAttachment);

router.post("/removeAttachment",projectResoController.RemoveAttachment);

router.post("/update",projectResoController.Update);

router.post("/delete",projectResoController.Delete);

router.post("/getData",projectResoController.GetData)

module.exports = router;
