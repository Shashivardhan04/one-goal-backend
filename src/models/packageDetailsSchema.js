const mongoose = require('mongoose');

const packageDetailsSchema = new mongoose.Schema({
  organization_id: {
    type: String,
    required: true,
  },
  package_id: {
    type: String,
    required: true
  },
  oid: {
    type: String,
    required: true
  },
  issued_licences: {
    type: String,
    required: true
  },
  valid_till: {
    type: Date,
    required: true,
  },
  valid_from: {
    type: Date,
    required: true,
  },
  package_status: {
    type: String,
    required: true,
    enum: ['active', 'inactive'], // Example of possible statuses
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  package_email_id: {
    type: String,
    required: true,
  },
  service_id: { type: String, default: "" },
  package_name: {
    type: String,
    // required:true
  },
  package_amount: {
    type: String,
    // required:true
  },
  no_of_unit: {
    type: String,
    // required:true
  },
});

const packageDetails = mongoose.model('packageDetails', packageDetailsSchema);

module.exports = packageDetails;
