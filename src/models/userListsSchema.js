const mongoose = require("mongoose");

const userListSchema = new mongoose.Schema(
  {},
  {
    strict: false, // Allows dynamic schema updates
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Enables automatic timestamps
  }
);

const userListModel = mongoose.model("newUserList", userListSchema);

module.exports = userListModel;
