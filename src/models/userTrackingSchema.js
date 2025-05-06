const mongoose = require('mongoose');

const userTrackingSchema = new mongoose.Schema({
  organization_id: { type: String, required: true},
  uid: { type: String,required: true},
  date: { type: Date, required: true},
  coordinates: { type: Array, default: [] },
});

const userTracking = mongoose.model('userTracking', userTrackingSchema);

module.exports = userTracking;
