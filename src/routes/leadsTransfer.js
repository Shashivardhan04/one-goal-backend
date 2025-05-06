const express = require('express');
const leadsTransferController = require('../controllers/leadsTransferController');
var router = express.Router();

const {
    TransferLeads,
    CreateNotes,
    UpdateNotes,
    UpdateCallLogs,
    UpdateAttachment,
    GetContactResource,
} = leadsTransferController;

router.get('/', (req, res) => res.send('you are in Testing Environment...'));

router.post('/bulkLeadTransfer', TransferLeads);

router.post('/createNotes', CreateNotes);

router.post('/updateNotes', UpdateNotes);

router.post('/updateCallLogs',UpdateCallLogs);

router.post('/updateAttachment',UpdateAttachment);

router.post('/getContactResourceData',GetContactResource);

module.exports = router;
