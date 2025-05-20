const mongoose = require("mongoose");

const apiTokenSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring integrity of data
    source: { type: String, required: true }, // API source is required
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      required: true,
    }, // Restrict status values
    country_code: { type: String, default: "" },
    created_by: { type: String, default: "" },
    modified_by: { type: String, default: "" },
    token: { type: String, required: true, unique: true }, // Making token unique for security

    timestamps: { type: Date, default: Date.now }, // Single timestamp field for cleaner design
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const ApiTokenModel = mongoose.model("apiTokens", apiTokenSchema);

module.exports = ApiTokenModel;
