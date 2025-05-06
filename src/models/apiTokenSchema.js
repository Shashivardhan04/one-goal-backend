const mongoose = require('mongoose');

const apiTokenSchema = new mongoose.Schema(
  {
    // id: { type: String, default: '' },
    organization_id: { type: String, default: '', required: true },
    // primary_lead_manager_email: { type: String, default: '' },
    // primary_lead_manager_uid: { type: String, default: '' },
    source: { type: String, default: '', required: true },
    status: { type: String, default: 'ACTIVE', enum: ["ACTIVE", "INACTIVE"], required: true },
    country_code: { type: String, default: '' },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: String, default: ''},
    modified_by: { type: String, default: ''},
    token: { type: String, default: '', required: true },
  }
);

const apiTokenModel = new mongoose.model('apiTokens', apiTokenSchema);

module.exports = apiTokenModel;
