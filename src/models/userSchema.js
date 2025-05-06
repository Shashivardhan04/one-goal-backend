const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  created_at: { type: Date, default: Date.now },
  contact_no: { type: String, default: '' },
  created_by: { type: String, default: '' },
  team: { type: String, default: '' },
  designation: { type: String, default: '' },
  device_id: { type: String, default: '' },
  organization_id: { type: String, default: '' },
  profile: { type: String, default: '' },
  reporting_to: { type: String, default: '' },
  status: { type: String, default: '' },
  branch: { type: String, default: '' },
  uid: { type: String, reqired: true, unique: true },
  user_email: { type: String, required: true, unique: true },
  user_first_name: { type: String, required: true },
  user_image: { type: String, default: '' },
  user_last_name: { type: String, default: '' },
  branchPermission: { type: Array, default: [] },
  leadView: { type: Object, default: {} },
  activated_at: { type: Date, default: Date.now },
  deactivated_at: { type: Date },
  is_live_tracking_active: { type: Boolean, default: false },
  last_tracked_date_and_time: { type: Date },
  user_rating: { type: String, default: "" },
  rating_given_by: { type: String, default: "" },
  group_head_name: { type: String, default: "" },
  employee_id: { type: String, default: "" },
  last_updated_at_contact_panel: { type: String, default: '' },
  last_updated_at_task_panel: { type: String, default: '' },
  last_updated_at_calllog_panel: { type: String, default: '' },

  // New fields for authentication and authorization
  password: { type: String, required: true }, // Add password for authentication
  passwordSalt: { type: String, required: true }, // Add password Salt for authentication verification
  token: { type: String }, // Add token for JWT
  session_id: { type: String, default: "" },
  device_type: { type: String, default: "" },
  role: { type: String, enum: ['superAdmin', 'Operation Manager', 'organization', 'Lead Manager', 'Sales', 'Team Lead'] }, // Add role for role-based authorization
  first_login: { type: Boolean, default: true }, 
  fcm_token: { type: String, default: "" },
  user_oid: { type: String, default: "" },
  user_super_oid: { type: String, default: "" },
  is_mobile_updation_declared: {type: Boolean, default: false},
  user_mb_isd:{type: String, default: "50" },
  user_last_login_via:{type: String },
  user_last_login_time:{ type: Date, default: null}
});

const newUser = mongoose.model('users', userSchema);

module.exports = newUser;
