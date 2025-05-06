const mongoose = require("mongoose");

const licenceTrackingSchema = new mongoose.Schema({
    organization_id: { type: String, default: "" },
    data: { type: Array, default: [] },
});

const newLead = mongoose.model("licenceTracking", licenceTrackingSchema);

module.exports = newLead;