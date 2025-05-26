const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring integrity of data

    sms: {
      url: { type: String },
      url_type: { type: String },
      headers: [{ key: { type: String }, value: { type: String } }],
      parameters: [{ key: { type: String }, value: { type: String } }],
      integration_type: { type: String },
      triggers: [
        {
          type: String,
          enum: [
            "Lead Allotment",
            "On Task Creation",
            "On Scheduled Date",
            "Completed Date",
          ],
        },
      ],
      description: { type: String },
    },

    whatsApp: {
      url: { type: String },
      url_type: { type: String },
      headers: [{ key: { type: String }, value: { type: String } }],
      parameters: [{ key: { type: String }, value: { type: String } }],
      integration_type: { type: String },
      triggers: [
        {
          type: String,
          enum: [
            "Lead Allotment",
            "On Task Creation",
            "On Scheduled Date",
            "Completed Date",
          ],
        },
      ],
      description: { type: String },
    },

    email: {
      url: { type: String },
      url_type: { type: String },
      headers: [{ key: { type: String }, value: { type: String } }],
      parameters: [{ key: { type: String }, value: { type: String } }],
      integration_type: { type: String },
      triggers: [
        {
          type: String,
          enum: [
            "Lead Allotment",
            "On Task Creation",
            "On Scheduled Date",
            "Completed Date",
          ],
        },
      ],
      description: { type: String },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const NotificationModel = mongoose.model("notifications", notificationSchema);

module.exports = NotificationModel;
