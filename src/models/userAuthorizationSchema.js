const mongoose = require("mongoose");

const userAuthorizationSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  organization_id: { type: String, required: true },
  created_at: { type: Date, default: new Date() },
  modified_at: { type: Date, default: new Date() },
  contact_transfer_approved: { type: Boolean, default: true },
  contact_mass_update_approved: { type: Boolean, default: true },
  contact_delete_record_approved: { type: Boolean, default: true },
  contact_import_approved: { type: Boolean, default: true },
  contact_export_approved: { type: Boolean, default: true },
  contact_create_approved: { type: Boolean, default: true },
  contact_update_approved: { type: Boolean, default: true },
  contact_change_lead_stage_approved: { type: Boolean, default: true },
  contact_attachments_create_approved: { type: Boolean, default: true },
  contact_attachments_delete_approved: { type: Boolean, default: true },
  contact_notes_create_approved: { type: Boolean, default: true },
  contact_call_log_create_approved: { type: Boolean, default: true },
  task_export_approved: { type: Boolean, default: true },
  project_import_approved: { type: Boolean, default: true },
  project_export_approved: { type: Boolean, default: true },
  project_delete_approved: { type: Boolean, default: true },
  project_create_approved: { type: Boolean, default: true },
  project_update_approved: { type: Boolean, default: true },
  project_attachments_create_approved: { type: Boolean, default: true },
  project_attachments_delete_approved: { type: Boolean, default: true },
  calllog_export_approved: { type: Boolean, default: true },
  api_export_approved: { type: Boolean, default: true },
  lead_distribution_create_approved: { type: Boolean, default: true },
  lead_distribution_update_approved: { type: Boolean, default: true },
  lead_distribution_delete_approved: { type: Boolean, default: true },
  faq_create_approved: { type: Boolean, default: true },
  faq_update_approved: { type: Boolean, default: true },
  faq_delete_approved: { type: Boolean, default: true },
  show_subscription_panel: { type: Boolean, default: true },
  resource_create_approved: { type: Boolean, default: true },
  resource_update_approved: { type: Boolean, default: true },
  resource_delete_approved: { type: Boolean, default: true },
});

const userAuthorization = mongoose.model(
  "userPermissions",
  userAuthorizationSchema
);

module.exports = userAuthorization;
