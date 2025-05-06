const mongoose = require("mongoose");

const storeSMSSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  organization_id: { type: String, required: true },
  mobile_number: { type: Number, required: true },
  sms_data: { type: String, required: true },
});

const storeSMS = mongoose.model(
  "userSMS",
  storeSMSSchema
);

module.exports = storeSMS;