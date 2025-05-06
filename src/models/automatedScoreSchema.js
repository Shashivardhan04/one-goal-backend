const mongoose = require("mongoose");

const automatedScoreSchema = new mongoose.Schema({
    organization_id: { type: String, default: "" },
    weights: {
      type: Map,
      of: Number,
      default: {},
    },
});

const automatedScore = mongoose.model("automatedScore", automatedScoreSchema);

module.exports = automatedScore;
