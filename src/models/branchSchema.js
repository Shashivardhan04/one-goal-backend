const mongoose = require("mongoose");

const branchSchemas = new mongoose.Schema(
  {
    organization_id: { type: String, default: "" },
    branch_name: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const newbranch = mongoose.model("branch", branchSchemas);
module.exports = newbranch;
