const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true },
    uid: { type: String, required: true },
    date: { type: Date, required: true },
    notification_title: { type: String, required: true },
    notification_description: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp names
  }
);

const notificationModel = mongoose.model("notification", notificationSchema);

module.exports = notificationModel;
