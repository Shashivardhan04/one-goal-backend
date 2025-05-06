const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    organization_id: { type: String, default: "" },
    contact_no:{ type: String, default: "" },
    reporting_to: { type: String, default: "" },
    branch: { type: String, default: "" },
    team: { type: String, default: "" },
    location: { type: String, default: "" },
    project: { type: String, default: "" },
    uid: { type: String, default: "" },
    contactDetails: { type: Object, default: {} },
    notes: { type: Array, default: [] },
    attachments: { type: Array, default: [] },
    callLogs: { type: Array, default: [] },
    bookingDetails: { type: Array, default: [] },
    created_at: { type: Date, default: new Date() },
});

const newLead = mongoose.model("booking", bookingSchema);

module.exports = newLead;
