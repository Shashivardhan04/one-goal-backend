const mongoose = require("mongoose");

/**
 * 📩 Store SMS Schema
 * Defines the structure for storing SMS data with validation, indexing, and standardized timestamps.
 */
const storeSMSSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, trim: true },
    organization_id: { type: String, required: true, trim: true },
    mobile_number: {
      type: String, // Changed from Number to String to avoid leading-zero loss
      required: true,
      validate: {
        validator: (num) => /^\d{10,15}$/.test(num), // Ensures valid mobile number format
        message: "Invalid mobile number format",
      },
    },
    sms_data: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

/** 🚀 Indexing for faster lookups */
storeSMSSchema.index({ uid: 1, organization_id: 1 });

const storeSMS = mongoose.model("userSMS", storeSMSSchema);

module.exports = storeSMS;
