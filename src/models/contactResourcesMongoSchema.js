const mongoose = require('mongoose');

const contactResourcesMongoSchema = new mongoose.Schema({
  leadId: { type: String, default: '' },
  attachments: { type: Array, default: [] },
  notes: { type: Array, default: [] },
  // uid: { type: String, default: '' },
  // organization_id: { type: String, default: '' },
  // customer_name: { type: String, default: '' },
  // contact_no: { type: String, default: '' },
  // stage: { type: String, default: '' },
  // contact_owner_email: { type: String, default: '' },
  // location: { type: String, default: '' },
  // project: { type: String, default: '' },
  // budget: { type: String, default: '' },
  // transfer_status: { type: Boolean, default: false },
  // inventory_type: { type: String, default: '' },
  // source: { type: String, default: '' },
});

const contactResourcesMongoModel = new mongoose.model(
  'contactresourcesmongo',
  contactResourcesMongoSchema
);

module.exports = contactResourcesMongoModel;
