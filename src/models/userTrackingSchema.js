const mongoose = require("mongoose");

const userTrackingSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring association with an organization
    uid: { type: String, required: true }, // Unique user identifier
    date: { type: Date, required: true }, // Tracking date
    coordinates: {
      type: [{ latitude: Number, longitude: Number, timestamp: Date }],
      default: [],
    }, // Structured coordinate storage
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const UserTrackingModel = mongoose.model("userTracking", userTrackingSchema);

module.exports = UserTrackingModel;
