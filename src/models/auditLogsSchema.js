const mongoose = require("mongoose");

const auditLogsSchema = new mongoose.Schema({
    uid: { type: String, default:"" },
    user_email: { type: String, default:"" },
    user_first_name: { type: String, default:"" },
    user_last_name: { type: String, default:"" },
    created_at: { type: Date, default:null },
    total_count: { type: String, default:"" },
    organization_id: { type: String, default: "" },
    type: { type: String, default:"" },
    operation_type: { type: String, default:"" },
    description: { type: String, default:"" },
});

const auditLogsModel = mongoose.model("auditLogs", auditLogsSchema);

module.exports = auditLogsModel;
