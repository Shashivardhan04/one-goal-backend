const mongoose = require('mongoose');

const integrationsSchema = new mongoose.Schema(
  {
    // id: { type: String, default: '' },
    organization_id: { type: String, default: '', required: true },
    integration_type: { type: String, default: '', enum: ["FB LEADS", "GOOGLE SHEET"], required: true },
    integration_name: { type: String, default: '', required: true },
    fb_page_name: { type: String, default: ''},
    fb_form_name: { type: String, default: ''},
    fb_page_access_token: { type: String, default: ''},
    fb_form_id: { type: String, default: ''},
    fb_last_updated_lead_time: { type: Date, default: Date.now },
    google_sheet_url: { type: String, default: ''},
    google_sheet_name: { type: String, default: ''},
    google_sheet_id: { type: String, default: ''},
    google_sheet_batch_interval: { type: String, default: ''},
    integration_status: { type: String,  default: '', enum: ["ACTIVE", "INACTIVE"], required: true },
    integration_mapped_fields: { type: Object, default: {} },
    created_at: { type: Date, default: Date.now },
    modified_at: { type: Date, default: Date.now },
    created_by: { type: String, default: '', required: true},
    modified_by: { type: String, default: '', required: true},
    last_updated_data:{type:String,default:0},
    data_updated_at: { type: Date, default: Date.now },
    locked: { type: Boolean, default: false, required: true },
  }
);

const integrationsModel = new mongoose.model('integrations', integrationsSchema);

module.exports = integrationsModel;
