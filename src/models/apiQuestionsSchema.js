const mongoose = require("mongoose");

const apiQuestionsSchema = new mongoose.Schema({
    leadId: { type: String, default: '' },
    organization_id: { type: String, default: '' },
    question_1: { type: String, default: null },
    answer_1: { type: String, default: null },
    question_2: { type: String, default: null },
    answer_2: { type: String, default: null },
    question_3: { type: String, default: null },
    answer_3: { type: String, default: null },
    question_4: { type: String, default: null },
    answer_4: { type: String, default: null },
});

const apiQuestionsModel = mongoose.model("apiQuestions", apiQuestionsSchema);

module.exports = apiQuestionsModel;
