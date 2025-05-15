const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    leadId: { type: String, default: "" },
    customer_name: { type: String, default: "" },
    contact_no: { type: String, default: "" },
    stage: { type: String, default: "" },
    contact_owner_email: { type: String, default: "" },
    call_back_reason: { type: String, default: "" },
    location: { type: String, default: "" },
    project: { type: String, default: "" },
    budget: { type: String, default: "" },
    transfer_status: { type: Boolean, default: false },
    unique_meeting: { type: Boolean, default: false },
    unique_site_visit: { type: Boolean, default: false },
    created_by: { type: String, default: "" },
    type: { type: String, default: "" },
    inventory_type: { type: String, default: "" },
    source: { type: String, default: "" },
    due_date: { type: Date, default: null }, // Default changed to null for flexibility
    completed_at: { type: Date, default: null },
    status: { type: String, default: "" },
    uid: { type: String, default: "" },
    organization_id: { type: String, default: "" },
    verified_status: { type: String, default: "" },
    verified_at: { type: Date, default: null },
    requested_at: { type: Date, default: Date.now }, // Kept default timestamp for tracking requests
    reporting_to: { type: String, default: "" },
    state: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp names
  }
);

const tasks = mongoose.model("tasks", taskSchema);

module.exports = tasks;
