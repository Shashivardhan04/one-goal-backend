const mongoose = require("mongoose");

const licenceTrackingSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring integrity of data
    data: [
      {
        count: { type: Number, default: 0 }, // Keeping count as a number for better aggregation
        date: { type: Date, default: Date.now }, // Using default timestamp
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const LicenceTrackingModel = mongoose.model(
  "licenceTracking",
  licenceTrackingSchema
);

module.exports = LicenceTrackingModel;
