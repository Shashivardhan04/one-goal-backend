const mongoose = require("mongoose");

const packageDetailsSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true },
    package_id: { type: String, required: true },
    oid: { type: String, required: true },
    issued_licences: { type: String, required: true },
    valid_till: { type: Date, required: true },
    valid_from: { type: Date, required: true },
    package_status: {
      type: String,
      required: true,
      enum: ["active", "inactive"], // Restrict to valid statuses
    },
    package_email_id: { type: String, required: true },
    service_id: { type: String, default: "" },
    package_name: { type: String, default: "" },
    package_amount: { type: String, default: "" },
    no_of_unit: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Correct timestamp naming
  }
);

const packageDetails = mongoose.model("packageDetails", packageDetailsSchema);

module.exports = packageDetails;
