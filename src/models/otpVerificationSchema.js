const mongoose = require("mongoose");

const otpVerificationSchema = new mongoose.Schema({
    uid: { type: String, default:"" },
    user_email: { type: String, default:"" },
    user_first_name: { type: String, default:"" },
    user_last_name: { type: String, default:"" },
    otp: { type: String, default:"" },
    created_at: { type: Date, default:null },
    expires_at: { type: Date, default:null },
    otp_sent_email:{ type: String, default:"" }
});

const otpVerificationModel = mongoose.model("otpVerification", otpVerificationSchema);

module.exports = otpVerificationModel;
