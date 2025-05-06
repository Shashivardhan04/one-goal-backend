const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
      },
      razorpay_payment_id: {
        type: String,
        required: true,
      },
      razorpay_signature: {
        type: String,
        required: true,
      },
      uid: {
        type: String,
        required: true,
      },
      contact_no: {
        type: String,
        required: true,
      },
      contact_owner_email: {
        type: String,
        required: true,
      },
      organization_id: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        required: true,
      },
      amount: {
        type: String,
        required: true,
      },
      currency: {
        type: String,
        required: true,
      },
      receipt: {
        type: String,
        required: true,
      },
      verified_at: { type: Date, default: new Date() },
      // invoice_no: {
      //   type: String
      // },
      // company: {
      //   type: String
      // },
      // email: {
      //   type: String
      // },
      // address: {
      //   type: String
      // },
      // transaction_date: {
      //   type: Date
      // },
      // due_date: {
      //   type: Date
      // },
      // paymentFrom: {
      //   type: Date
      // },
      // paymentTill: {
      //   type: Date
      // },
      // units: {
      //   type: Number
      // },
      // igst: {
      //   type: Boolean
      // },
      // items: [
      //   {
      //     serialNumber: {
      //       type: Number
      //     },
      //     description: {
      //       type: String
      //     },
      //     qty: {
      //       type: Number
      //     },
      //     hsn: {
      //       type: Number
      //     },
      //     rate: {
      //       type: Number
      //     },
      //     taxAmount: {
      //       type: Number
      //     }
      //   }
      // ]
});

const newPayment = mongoose.model('paymentsDetails', paymentSchema);

module.exports = newPayment;
