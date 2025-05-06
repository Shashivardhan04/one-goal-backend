const express = require("express");
require("dotenv").config();
var router = express.Router();
const rateLimit = require("express-rate-limit");
const RateLimitMongo = require('rate-limit-mongo');
// const RateLimit=require("../models/rateLimitSchema")
const nodemailer = require('nodemailer');
const {encryptautoLogin}=require("../constants/constants")

const app = require("../../firebase");

const URI = process.env.DB_URL
const READPRO_URL = process.env.READPRO_URL
const auth = app.auth();

// Create a rate limiter that limits the number of emails sent to a specific email address



const emailLimiter = rateLimit({
  store: new RateLimitMongo({
    uri: URI, // MongoDB connection URI
    collectionName: 'rateLimits', // Collection name for storing rate limit data
    expireTimeMs: 24 * 60 * 60 * 1000, // Expire time in milliseconds (24 hours)
    createTtlIndex: false
  }),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  max: 10, // limit each email address to 5 requests per windowMs
  keyGenerator: (req, res) => req.body.email, // use email as the key
  handler: (req, res, /*next*/) => {
    return res.status(429).json({
      success: false,
      message: "Too many requests, please try again later."
    });
  }
});

// Create a transporter object using the SMTP details without authentication
const transporter = nodemailer.createTransport({
  host: 'read-pro.smtp.mbrsl.mb',
  port: 25,
  secure: false, // true for 465, false for other ports
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  }
});

/////////////// forgot password endpoint /////////////////////
router.post("/", async (req, res) => {
  try {
    //       We hope this email finds you well. We noticed that you have requested a password reset for your ReadPro account.
    // To reset your password, please follow the link below:
    // https://read-pro.in/resetpassword?mode=action&oobCode=code
    // This link will redirect you to a page where you can create a new password for your ReadPro account. If you did not request a password reset, please ignore this email.
    // If you have any trouble resetting your password, please contact our support team at support@magicbricks.com.
    // Thank you for using ReadPro CRM.
    // Best regards
    // ReadPro Team
    const { email } = req.body;
    const encryptEmail = encryptautoLogin(email)
    encodeEmail = encodeURIComponent(encryptEmail)
    let forgetPasswordMail = `<div> We hope this email finds you well. We noticed that you have requested a password reset for your ReadPro account.
    To reset your password, please follow the link below:</div> <br/> <div>${READPRO_URL}/resetpassword?mode=resetPassword&oobCode=${encodeEmail}</div> <br/><div>This link will redirect you to a page where you can create a new password for your ReadPro account. If you did not request a password reset, please ignore this email.
    If you have any trouble resetting your password, please contact our support team at support@magicbricks.com.</div> <br/>  <div>Thank you for using ReadPro CRM.</div>  <br/><div>Best Regards</div>  <br/><div>Readpro Team</div>  <br/>`;
    transporter.sendMail({
      from: 'noreply@magicbricks.com', // sender address
      to: email, // list of receivers
      subject: "Reset your password for Readpro", // Subject line
      // text: 'Hello world?', // plain text body
      html: forgetPasswordMail // html body
    })
    // await auth.sendPasswordResetEmail(email);
    console.log(`Time - ${new Date()}, api endpoint - /forgetPassword, successfully ran`);
    return res.status(200).json({
      success: true,
      message: "Password reset information have been sent on you registered email id"
    });
  } catch (error) {
    console.log(`Time - ${new Date()}, api endpoint - /forgetPassword, error - ${error}`);
    return res.status(200).json({
      success: true,
      message: "Password reset information have been sent on you registered email id",
    });
  }
});

///////////////////////////////////////////////////////////////////


module.exports = router;