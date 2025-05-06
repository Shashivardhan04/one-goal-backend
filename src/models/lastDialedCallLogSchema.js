const mongoose = require("mongoose");

const lastDialedCallLogSchema  = new mongoose.Schema({
   
  contact_owner_email: { type: String, default: "" },
  uid: { type: String, default: "" },
  leadId:{ type: String, default: "" },
  contact_no: { type: String, default: "" },
  organization_id: { type: String, default: "" }

 


});

const lastDialedCallLog = mongoose.model("lastDialedCallLogs", lastDialedCallLogSchema);

module.exports = lastDialedCallLog ;