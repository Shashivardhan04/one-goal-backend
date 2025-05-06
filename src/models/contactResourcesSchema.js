const mongoose = require('mongoose');

const contactResoSchema = new mongoose.Schema({
  callLogs: { type: Array, default: [] },
  organization_id: { type: String, default: '' },
  uid: { type: String, default: '' },
});

const contactResoModel = new mongoose.model(
  'newcontactResources',
  contactResoSchema
);

module.exports = contactResoModel;
