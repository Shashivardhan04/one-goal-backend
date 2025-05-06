const mongoose = require("mongoose");

const dataUploadRequestSchema = new mongoose.Schema({
  created_at: { type: Date, default: Date.now },
  created_by: { type: String, default: "" },
  file_url: { type: String, default: "" },
  organization_id: { type: String, default: "" },
  request_id: { type: String, default: "" },
  response_url: { type: String, default: "" },
  status: { type: String, default: "" },
  uid: { type: String, default: "" },
  upload_count: { type: String, default: "" },
  type: { type: String, default: "" },
});

const dataUploadRequestModel = mongoose.model("dataUploadRequest", dataUploadRequestSchema);

module.exports = dataUploadRequestModel;
