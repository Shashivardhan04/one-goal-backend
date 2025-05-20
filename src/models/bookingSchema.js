const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    organization_id: { type: String, default: "", required: true },
    contact_no: { type: String, default: "" },
    reporting_to: { type: String, default: "" },
    branch: { type: String, default: "" },
    team: { type: String, default: "" },
    location: { type: String, default: "" },
    project: { type: String, default: "" },
    uid: { type: String, default: "" },
    contactDetails: { type: Object, default: {} },
    notes: { type: Array, default: [] },
    attachments: { type: Array, default: [] },
    callLogs: { type: Array, default: [] },
    bookingDetails: { type: Array, default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp naming
  }
);

const BookingModel = mongoose.model("booking", bookingSchema);

module.exports = BookingModel;
