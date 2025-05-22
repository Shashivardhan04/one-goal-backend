const mongoose = require("mongoose");

const auditLogsSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true }, // Unique user identifier
    user_email: { type: String, required: true, lowercase: true }, // Normalize email case
    user_first_name: { type: String, required: true },
    user_last_name: { type: String, required: true },
    created_at: { type: Date, default: Date.now }, // Auto-generated timestamp
    total_count: { type: Number, required: true }, // Ensure numeric consistency
    organization_id: { type: String, required: true }, // Links to organization
    type: { type: String, required: true },
    operation_type: { type: String, required: true },
    description: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standard timestamp tracking
  }
);

const AuditLogsModel = mongoose.model("AuditLogs", auditLogsSchema);

module.exports = AuditLogsModel;
