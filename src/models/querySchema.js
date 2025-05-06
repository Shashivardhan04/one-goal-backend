const mongoose = require('mongoose');

const querySchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true },
    ticket_no: { type: Number },
    mobile_no: { type: Number, required: true },
    organization_name: { type: String, required: true },
    customer_name: { type: String, required: true },
    customer_email_id: { type: String, required: true },
    type_of_query: { type: String, required: true },
    attachment: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: 'Open' },
  },
  { timestamps: true }
);

const queryDataModel = mongoose.model('Query', querySchema);

module.exports = queryDataModel;
