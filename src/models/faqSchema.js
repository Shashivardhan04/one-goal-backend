const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema(
  {
    organization_id: { type: String, required: true }, // Ensuring integrity of data
    question: { type: String, required: true }, // Required field for FAQs
    answer: { type: String, required: true }, // Required field for FAQs
    created_by: { type: String, default: "" },
    modified_by: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const FAQModel = mongoose.model("faq", faqSchema);

module.exports = FAQModel;
