const mongoose = require("mongoose");

const contactResoSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring integrity of data
    uid: { type: String, required: true }, // Making uid a required field
    callLogs: [
      {
        type: Object,
        default: {},
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const ContactResourceModel = mongoose.model(
  "contactResources",
  contactResoSchema
);

module.exports = ContactResourceModel;
