const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    created_at: { type: Date, default: Date.now },
    device_id: { type: String, default: '' },
    device_ip: { type: String, default: '' },
    device_name: { type: String, default: '' },
    organization_id: { type: String, default: '', required: true },
    uid: { type: String, required: true },
    session_id: { type: String, default: "", required: true },
    device_type: { type: String, default: "", required: true },
    user_oid: { type: String, default: "" },
    user_last_login_via: { type: String, required: true },
    user_last_login_time: { type: Date, required: true },
    activity_type: { type: String, required: true },
});

const userActivity = mongoose.model('userActivity', userActivitySchema);

module.exports = userActivity;