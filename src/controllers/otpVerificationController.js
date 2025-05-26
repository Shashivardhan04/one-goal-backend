var ObjectId = require("mongoose").Types.ObjectId;
const otpVerificationModel = require("../models/otpVerificationSchema.js");
const admin = require("../../firebaseAdmin.js");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const logger = require("../services/logger");

const sendMail = async (mail, mailId, subject) => {
  try {
    /** 🛑 Validate required fields */
    if (!mail || !mailId || !subject) {
      throw new Error("Missing required fields: mail, mailId, or subject.");
    }

    logger.info(`📡 Sending email to: ${mailId}, Subject: ${subject}`);

    /** 🚀 Send email using Firestore */
    await admin
      .firestore()
      .collection("mail")
      .add({
        to: mailId,
        message: {
          subject,
          html: mail,
        },
      });

    logger.info(`✅ Email sent successfully to ${mailId}`);

    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    logger.error(`❌ Error sending email: ${error.message}`);
    return {
      success: false,
      message: "Failed to send email",
      error: error.message,
    };
  }
};

// Create a transporter object using the SMTP details without authentication
const transporter = nodemailer.createTransport({
  host: "read-pro.smtp.mbrsl.mb",
  port: 25,
  secure: false, // Use 'true' for SSL connections (port 465), false for non-SSL
  tls: {
    rejectUnauthorized: false, // Prevents errors from self-signed certificates
  },
  connectionTimeout: 5000, // Ensures timeout handling for failed connections
  greetingTimeout: 5000, // Prevents delays in SMTP communication
  socketTimeout: 5000, // Manages socket transmission timeout
});

const otpVerificationController = {};

/**
 * 🔒 Send OTP Verification
 * Handles OTP generation, storage, and email delivery with structured validation and logging.
 */
otpVerificationController.sendOtpVerification = async (req, res) => {
  try {
    const {
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_mail,
      data_count,
      type,
      operationType,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !uid ||
      !user_email ||
      !user_first_name ||
      !otp_mail ||
      !data_count ||
      typeof data_count !== "number"
    ) {
      logger.warn("⚠️ Missing or invalid required fields for OTP verification");
      return res
        .status(400)
        .json({ success: false, message: "Failed To Send OTP", status: 400 });
    }

    logger.info(`📡 Generating OTP for UID: ${uid}`);

    /** 🔄 Generate and hash OTP */
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedOTP = await bcrypt.hash(otp, 10);

    /** 🚀 Remove previous OTP requests */
    await otpVerificationModel.deleteMany({ uid });

    /** 💾 Store new OTP request */
    const newOtpVerification = new otpVerificationModel({
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_sent_email: otp_mail,
      otp: hashedOTP,
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
    });

    await newOtpVerification.save();

    /** 📧 Prepare OTP email */
    const otpMail = `
      <div>Dear Customer,</div> <br/>
      <div>${user_first_name} ${user_last_name} (${user_email}) is requesting to ${
      operationType === "delete" ? "delete" : "export"
    } ${data_count} records from ${type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br/>
      <div>Best Regards</div>
    `;

    const otpMailSubject = `READ PRO Data ${
      operationType === "delete" ? "Delete" : "Export"
    } Request!!`;

    /** 🚀 Send OTP email */
    await sendMail(otpMail, [otp_mail], otpMailSubject);

    logger.info(`✅ OTP Sent Successfully to ${otp_mail}`);
    return res
      .status(200)
      .json({ success: true, message: "OTP Sent Successfully", status: 200 });
  } catch (error) {
    logger.error(`❌ Error sending OTP: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed To Send OTP",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * ✅ Verify OTP
 * Validates the OTP for user authentication.
 */
otpVerificationController.verifyOtp = async (req, res) => {
  try {
    const { uid, otp } = req.body;

    /** 🛑 Validate required fields */
    if (!uid || !otp) {
      logger.warn("⚠️ Missing required fields for OTP verification");
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
        status: 400,
      });
    }

    logger.info(`📡 Verifying OTP for UID: ${uid}`);

    /** 🔍 Fetch OTP record */
    const otpVerificationRecord = await otpVerificationModel
      .findOne({ uid })
      .lean();
    if (!otpVerificationRecord) {
      logger.warn(`⚠️ No OTP record found for UID: ${uid}`);
      return res
        .status(404)
        .json({ success: false, message: "Record doesn't exist", status: 404 });
    }

    /** 🛑 Check OTP expiration */
    if (otpVerificationRecord.expires_at < Date.now()) {
      await otpVerificationModel.deleteMany({ uid });
      logger.warn(`⚠️ OTP expired for UID: ${uid}`);
      return res.status(400).json({
        success: false,
        message: "OTP has expired, please request a new OTP",
        status: 400,
      });
    }

    /** 🚀 Validate OTP */
    const isValidOtp = await bcrypt.compare(otp, otpVerificationRecord.otp);
    if (!isValidOtp) {
      logger.warn(`⚠️ Invalid OTP entered for UID: ${uid}`);
      return res.status(400).json({
        success: false,
        message: "Invalid OTP, please try again",
        status: 400,
      });
    }

    /** ✅ OTP Verified Successfully */
    await otpVerificationModel.deleteMany({ uid });
    logger.info(`✅ OTP verified successfully for UID: ${uid}`);
    return res.status(200).json({
      success: true,
      message: "OTP Verified Successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(`❌ Error verifying OTP: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Resend OTP
 * Handles OTP regeneration, storage, and email delivery with structured validation and logging.
 */
otpVerificationController.resendOtp = async (req, res) => {
  try {
    const {
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_mail,
      data_count,
      type,
      operationType,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !uid ||
      !user_email ||
      !user_first_name ||
      !otp_mail ||
      !data_count ||
      typeof data_count !== "number"
    ) {
      logger.warn("⚠️ Missing or invalid required fields for OTP resend");
      return res
        .status(400)
        .json({ success: false, message: "Failed To Send OTP", status: 400 });
    }

    logger.info(`📡 Resending OTP for UID: ${uid}`);

    /** 🚀 Remove previous OTP requests */
    await otpVerificationModel.deleteMany({ uid });

    /** 🔄 Generate and hash OTP */
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedOTP = await bcrypt.hash(otp, 10);

    /** 💾 Store new OTP request */
    const newOtpVerification = new otpVerificationModel({
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_sent_email: otp_mail,
      otp: hashedOTP,
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
    });

    await newOtpVerification.save();

    /** 📧 Prepare OTP email */
    const otpMail = `
      <div>Dear Customer,</div> <br/>
      <div>${user_first_name} ${user_last_name} (${user_email}) is requesting to ${
      operationType === "delete" ? "delete" : "export"
    } ${data_count} records from ${type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br/>
      <div>Best Regards</div>
    `;

    const otpMailSubject = `READ PRO Data ${
      operationType === "delete" ? "Delete" : "Export"
    } Request!!`;

    /** 🚀 Send OTP email */
    const mailOptions = {
      from: "noreply@magicbricks.com",
      to: otp_mail,
      subject: otpMailSubject,
      html: otpMail,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error(`❌ Error sending OTP email: ${error.message}`);
        return res.status(500).json({
          success: false,
          message: "Failed To Send OTP",
          error: error.message,
          status: 500,
        });
      }
      logger.info(`✅ OTP Sent Successfully - Message ID: ${info.messageId}`);
    });

    return res
      .status(200)
      .json({ success: true, message: "OTP Sent Successfully", status: 200 });
  } catch (error) {
    logger.error(`❌ Error resending OTP: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed To Re Send OTP",
      error: error.message,
      status: 500,
    });
  }
};

/**
 * 🔄 Send OTP Verification (New)
 * Handles OTP generation, storage, and email delivery with structured validation and logging.
 */
otpVerificationController.sendOtpVerificationNew = async (req, res) => {
  try {
    const {
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_mail,
      data_count,
      type,
      operationType,
    } = req.body;

    /** 🛑 Validate required fields */
    if (
      !uid ||
      !user_email ||
      !user_first_name ||
      !otp_mail ||
      !data_count ||
      typeof data_count !== "number"
    ) {
      logger.warn("⚠️ Missing or invalid required fields for OTP verification");
      return res
        .status(400)
        .json({ success: false, message: "Failed to send OTP", status: 400 });
    }

    logger.info(`📡 Generating OTP for UID: ${uid}`);

    /** 🔄 Generate and hash OTP */
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedOTP = await bcrypt.hash(otp, 10);

    /** 🚀 Remove previous OTP requests */
    await otpVerificationModel.deleteMany({ uid });

    /** 💾 Store new OTP request */
    const newOtpVerification = new otpVerificationModel({
      uid,
      user_email,
      user_first_name,
      user_last_name,
      otp_sent_email: otp_mail,
      otp: hashedOTP,
      created_at: Date.now(),
      expires_at: Date.now() + 300000,
    });

    await newOtpVerification.save();

    /** 📧 Prepare OTP email */
    const otpMail = `
      <div>Dear Customer,</div> <br/>
      <div>${user_first_name} ${user_last_name} (${user_email}) is requesting to ${
      operationType === "delete" ? "delete" : "export"
    } ${data_count} records from ${type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br/>
      <div>Best Regards</div>
    `;

    const otpMailSubject = `READ PRO Data ${
      operationType === "delete" ? "Delete" : "Export"
    } Request!!`;

    /** 🚀 Send OTP email */
    const mailOptions = {
      from: "noreply@magicbricks.com",
      to: otp_mail,
      subject: otpMailSubject,
      html: otpMail,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error(`❌ Error sending OTP email: ${error.message}`);
        return res
          .status(500)
          .json({
            success: false,
            message: "Failed to send OTP",
            error: error.message,
            status: 500,
          });
      }
      logger.info(`✅ OTP sent successfully - Message ID: ${info.messageId}`);
    });

    return res
      .status(200)
      .json({ success: true, message: "OTP sent successfully", status: 200 });
  } catch (error) {
    logger.error(`❌ Error sending OTP: ${error.message}`);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to send OTP",
        error: error.message,
        status: 500,
      });
  }
};

module.exports = otpVerificationController;
