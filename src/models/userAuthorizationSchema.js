const mongoose = require("mongoose");

const userAuthorizationSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true },
    organization_id: { type: String, required: true },

    // Contact-related permissions
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

    // Task & project permissions
    task_export_approved: { type: Boolean, default: true },
    project_import_approved: { type: Boolean, default: true },
    project_export_approved: { type: Boolean, default: true },
    project_delete_approved: { type: Boolean, default: true },
    project_create_approved: { type: Boolean, default: true },
    project_update_approved: { type: Boolean, default: true },
    project_attachments_create_approved: { type: Boolean, default: true },
    project_attachments_delete_approved: { type: Boolean, default: true },

    // Export-related permissions
    calllog_export_approved: { type: Boolean, default: true },
    api_export_approved: { type: Boolean, default: true },

    // Lead distribution permissions
    lead_distribution_create_approved: { type: Boolean, default: true },
    lead_distribution_update_approved: { type: Boolean, default: true },
    lead_distribution_delete_approved: { type: Boolean, default: true },

    // FAQ permissions
    faq_create_approved: { type: Boolean, default: true },
    faq_update_approved: { type: Boolean, default: true },
    faq_delete_approved: { type: Boolean, default: true },

    // Subscription & resource permissions
    show_subscription_panel: { type: Boolean, default: true },
    resource_create_approved: { type: Boolean, default: true },
    resource_update_approved: { type: Boolean, default: true },
    resource_delete_approved: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp naming
  }
);

const userAuthorization = mongoose.model(
  "userPermissions",
  userAuthorizationSchema
);

module.exports = userAuthorization;
