const mongoose = require("mongoose");

const callLogsSchema = new mongoose.Schema(
  {
    leadId: { type: String, default: "" },
    customer_name: { type: String, default: "" },
    contact_no: { type: String, default: "" },
    stage: { type: String, default: "" },
    contact_owner_email: { type: String, default: "" },
    location: { type: String, default: "" },
    project: { type: String, default: "" },
    budget: { type: String, default: "" },
    transfer_status: { type: Boolean, default: false },
    created_by: { type: String, default: "" },
    inventory_type: { type: String, default: "" },
    duration: { type: Number, default: 0 },
    uid: { type: String, default: "" },
    organization_id: { type: String, default: "" },
    state: { type: String, default: "" },
    lead_source: { type: String, default: "" },
    call_recording_url: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Proper naming for timestamps
  }
);

const newCallLog = mongoose.model("calllogs", callLogsSchema);

module.exports = newCallLog;
