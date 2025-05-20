const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    razorpay_signature: { type: String, required: true },
    uid: { type: String, required: true },
    contact_no: { type: String, required: true },
    contact_owner_email: { type: String, required: true },
    organization_id: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed"],
    }, // Added enum for validation
    amount: { type: Number, required: true }, // Changed type to Number for accuracy
    currency: { type: String, required: true, default: "INR" }, // Default currency set
    receipt: { type: String, required: true },
    verified_at: { type: Date, default: Date.now }, // Optimized default timestamp

    invoice_no: { type: String },
    company: { type: String },
    email: { type: String },
    address: { type: String },
    transaction_date: { type: Date },
    due_date: { type: Date },
    paymentFrom: { type: Date },
    paymentTill: { type: Date },
    units: { type: Number },
    igst: { type: Boolean, default: false },

    items: [
      {
        serialNumber: { type: Number },
        description: { type: String },
        qty: { type: Number },
        hsn: { type: Number },
        rate: { type: Number },
        taxAmount: { type: Number },
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, // Standardized timestamp naming
  }
);

const PaymentModel = mongoose.model("paymentsDetails", paymentSchema);

module.exports = PaymentModel;
