const mongoose = require("mongoose");

const querySchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true }, // Ensuring user association
    ticket_no: { type: Number, unique: true, sparse: true }, // Allows optional unique tickets
    mobile_no: { type: String, required: true }, // Changed to String to support country codes
    organization_name: { type: String, required: true },
    customer_name: { type: String, required: true },
    customer_email_id: { type: String, required: true, lowercase: true }, // Ensuring consistency
    type_of_query: { type: String, required: true },
    attachment: { type: String }, // Removed required constraint (optional in many cases)
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["Open", "Closed", "Pending"],
      default: "Open",
    }, // Prevents unexpected values
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const QueryModel = mongoose.model("Query", querySchema);

module.exports = QueryModel;
