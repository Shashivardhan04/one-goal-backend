const mongoose = require("mongoose");

const lastDialedCallLogSchema = new mongoose.Schema(
  {
    contact_owner_email: { type: String, required: true, lowercase: true }, // Normalize email case
    uid: { type: String, required: true }, // Unique user identifier
    leadId: { type: String, required: true }, // Lead identifier
    contact_no: { type: String, required: true }, // Ensures contact number presence
    organization_id: { type: String, required: true }, // Links to organization
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standard timestamp tracking
  }
);

const LastDialedCallLog = mongoose.model(
  "LastDialedCallLog",
  lastDialedCallLogSchema
);

module.exports = LastDialedCallLog;
