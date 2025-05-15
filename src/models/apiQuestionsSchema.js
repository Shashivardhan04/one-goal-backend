const mongoose = require("mongoose");

const apiQuestionsSchema = new mongoose.Schema(
  {
    leadId: { type: String, default: "" },
    organization_id: { type: String, default: "" },
    questions: [
      {
        question: { type: String, default: null },
        answer: { type: String, default: null },
      },
    ], // Replaces individual question-answer pairs with an array for better scalability
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp names
  }
);

const apiQuestionsModel = mongoose.model("apiQuestions", apiQuestionsSchema);

module.exports = apiQuestionsModel;
