const mongoose = require("mongoose");

const apiDataSchema = new mongoose.Schema(
  {
    alternate_no: { type: String, default: "" },
    associate_contact: { type: String, default: "" },
    budget: { type: String, default: "" },
    contact_no: { type: String, default: "" },
    contact_owner_email: { type: String, default: "" },
    country_code: { type: String, default: "" },
    lead_assign_time: { type: Date, default: Date.now },
    created_by: { type: String, default: "" },
    customer_name: { type: String, default: "" },
    email: { type: String, default: "" },
    fail_reason: { type: String, default: "" },
    lead_source: { type: String, default: "" },
    location: { type: String, default: "" },
    organization_id: { type: String, default: "" },
    project: { type: String, default: "" },
    property_stage: { type: String, default: "" },
    property_type: { type: String, default: "" },
    stage: { type: String, default: "" },
    status: { type: String, default: "" },
    api_forms: { type: String, default: "" },
    leadId: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp names
  }
);

const apiDataModel = mongoose.model("apiData", apiDataSchema);

module.exports = apiDataModel;
