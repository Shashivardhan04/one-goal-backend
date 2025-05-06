const mongoose = require('mongoose');

const smsSchema = new mongoose.Schema({
  organization_id: { type: String, default: '' },
  sms: {
    url: { type: String },
    url_type: { type: String },
    headers: [{ key: { type: String }, value: { type: String } }],
    parameters: [{ key: { type: String }, value: { type: String } }],
    integration_type: { type: String },
    triggers: [
      {
        type: String,
        enum: [
          'Lead Allotment',
          'On Task Creation',
          'On Scheduled Date',
          'Completed Date',
        ],
      },
    ],
    description: { type: String },
  },
  whatsApp: {
    url: { type: String },
    url_type: { type: String },
    headers: [{ key: { type: String }, value: { type: String } }],
    parameters: [{ key: { type: String }, value: { type: String } }],
    integration_type: { type: String },
    triggers: [
      {
        type: String,
        enum: [
          'Lead Allotment',
          'On Task Creation',
          'On Scheduled Date',
          'Completed Date',
        ],
      },
    ],
    description: { type: String },
  },
  email: {
    url: { type: String },
    url_type: { type: String },
    headers: [{ key: { type: String }, value: { type: String } }],
    parameters: [{ key: { type: String }, value: { type: String } }],
    integration_type: { type: String },
    triggers: [
      {
        type: String,
        enum: [
          'Lead Allotment',
          'On Task Creation',
          'On Scheduled Date',
          'Completed Date',
        ],
      },
    ],
    description: { type: String },
  },
});

const newSms = mongoose.model('sms', smsSchema);

module.exports = newSms;
