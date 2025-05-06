const express = require('express');
const s3Controller = require('../controllers/s3Controller');
var router = express.Router();

const {
  DataUpload,
  DeleteS3File
} = s3Controller;


router.post('/dataUpload', DataUpload);
router.delete('/deleteFile', DeleteS3File);

module.exports = router;

