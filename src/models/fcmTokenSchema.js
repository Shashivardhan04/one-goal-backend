const mongoose = require("mongoose");

const fcmSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allows flexible schema definition
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Corrected timestamp names
  }
);

const newfcm = mongoose.model("newfcmTokens", fcmSchema);

module.exports = newfcm;
