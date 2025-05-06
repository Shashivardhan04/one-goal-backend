var ObjectId = require('mongoose').Types.ObjectId;
const otpVerificationModel = require('../models/otpVerificationSchema.js');
const admin = require("../../firebaseAdmin.js");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');

const sendMail = async(mail,mailId,subject) => {
  try{ 
    await admin.firestore().collection("mail").add({
     to: mailId,
     message: {
       subject: subject,
       html:mail
     },
   })
  }
  catch(err){
     console.log("error",err)
  }
};

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

const otpVerificationController = {};

otpVerificationController.sendOtpVerfication = async (req, res) => {
  try{
    let data = req.body;
    if(!data.uid  || !data.user_email || !data.user_first_name || !data.otp_mail|| !data.data_count || typeof data.data_count !== 'number'){
      return res.status(400).json({success:false,message:"Failed To Send OTP"});
    }
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`
    const saltRounds = 10
    const hashedOTP = await bcrypt.hash(otp, saltRounds)
    let otpRequestExists = await otpVerificationModel.find({uid:data.uid});
    if (otpRequestExists.length > 0) {
      await otpVerificationModel.deleteMany({uid:data.uid})
    }
    const newOtpVerification = await new otpVerificationModel({
        uid:data.uid,
        user_email:data.user_email,
        user_first_name:data.user_first_name,
        user_last_name:data.user_last_name,
        otp_sent_email:data.otp_mail,
        otp: hashedOTP,
        created_at: Date.now(),
        expires_at: Date.now() + 300000
    })
    await newOtpVerification.save()
    let userFirstName = data.user_first_name ? data.user_first_name : "";
    let userLastName = data.user_last_name ? data.user_last_name : "";
    let userEmail = data.user_email ? data.user_email : "";
    let dataCount = data.data_count ? data.data_count : "";
    let panel_type = data.type ? data.type : "";
    let otpMail
    let otpMailSubject
    if(data.operationType === 'delete'){
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to delete ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Delete request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Delete Request!!`
    }
    else{
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to export ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Export request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Export Request!!`
    }
    await sendMail(otpMail,[`${data.otp_mail}`],otpMailSubject);
    res.status(200).json({success:true,message:"OTP Sent Successfully"})
    
  }catch(err){
    console.log(err);
    res.status(400).json({success:false,message:"Failed To Send OTP"});
  }
};

otpVerificationController.verifyOtp = async (req, res) => {
  try{
    let data = req.body;
    const otpVerificationRecord = await otpVerificationModel.find({uid:data.uid});
    if (otpVerificationRecord.length <= 0) {
      return res.status(400).json({success:false,message:"Record Doesn't Exist"})
    }
    else {
        ///OTP Record exist
        const { expires_at } = otpVerificationRecord[0]
        // const { hashedOTP } = UserOTPVerificationRecord[0].otp
        if (expires_at < Date.now()) {
            await otpVerificationModel.deleteMany({uid:data.uid})
            return res.status(400).json({success:false,message:"OTP has expired , Please request a new OTP"})
        }
        else{
            const validOtp =  await bcrypt.compare(data.otp,otpVerificationRecord[0].otp)
            if(!validOtp){
              return res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
            }
            else{
                await otpVerificationModel.deleteMany({uid:data.uid})
                res.status(200).json({success:true,message:"OTP Verified Successfully"})
            }
        }
    }
  }catch(err){
    console.log(err);
    res.status(400).json({success:false,message:"Failed To Verify OTP"});
  }
};

otpVerificationController.resendOtp = async (req, res) => {
    try{
      let data = req.body;
      if(!data.uid  || !data.user_email || !data.user_first_name || !data.otp_mail|| !data.data_count || typeof data.data_count !== 'number'){
        return res.status(400).json({success:false,message:"Failed To Send OTP"});
      }
      await otpVerificationModel.deleteMany({uid:data.uid})
      const otp = `${Math.floor(1000 + Math.random() * 9000)}`
      const saltRounds = 10
      const hashedOTP = await bcrypt.hash(otp, saltRounds)
      const newOtpVerification = await new otpVerificationModel({
        uid:data.uid,
        user_email:data.user_email,
        user_first_name:data.user_first_name,
        user_last_name:data.user_last_name,
        otp_sent_email:data.otp_mail,
        otp: hashedOTP,
        created_at: Date.now(),
        expires_at: Date.now() + 300000
    })
    await newOtpVerification.save()
    let userFirstName = data.user_first_name ? data.user_first_name : "";
    let userLastName = data.user_last_name ? data.user_last_name : "";
    let userEmail = data.user_email ? data.user_email : "";
    let dataCount = data.data_count ? data.data_count : "";
    let panel_type = data.type ? data.type : "";
    let otpMail
    let otpMailSubject
    if(data.operationType === 'delete'){
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to delete ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Delete request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Delete Request!!`
    }
    else{
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to export ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Export request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Export Request!!`
    }
    // await sendMail(otpMail,[`${data.otp_mail}`],otpMailSubject);
    const mailOptions = {
      from: 'noreply@magicbricks.com', // sender address
      to: data.otp_mail, // list of receivers
      subject: otpMailSubject, // Subject line
      // text: 'Hello world?', // plain text body
      html: otpMail // html body
    };
    // Send the email
    // console.log("mailOptions",mailOptions)
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
     console.log("errorrrrrrr",error);
     return res.status(400).json({success:false,message:"Failed To Send OTP"});
  }
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
});
    res.status(200).json({success:true,message:"OTP Sent Successfully"})     
    }catch(err){
      console.log(err);
      res.status(400).json({success:false,message:"Failed To Re Send OTP"});
    }
  };


otpVerificationController.sendOtpVerficationNew = async (req, res) => {
  try{
    let data = req.body;
    // console.log("sendOtpVerficatinNewffff",data)
    if(!data.uid  || !data.user_email || !data.user_first_name || !data.otp_mail|| !data.data_count || typeof data.data_count !== 'number'){
      return res.status(400).json({success:false,message:"Failed To Send OTP"});
    }
    const otp = `${Math.floor(1000 + Math.random() * 9000)}`
    const saltRounds = 10
    const hashedOTP = await bcrypt.hash(otp, saltRounds)
    let otpRequestExists = await otpVerificationModel.find({uid:data.uid});
    if (otpRequestExists.length > 0) {
      await otpVerificationModel.deleteMany({uid:data.uid})
    }
    const newOtpVerification = await new otpVerificationModel({
        uid:data.uid,
        user_email:data.user_email,
        user_first_name:data.user_first_name,
        user_last_name:data.user_last_name,
        otp_sent_email:data.otp_mail,
        otp: hashedOTP,
        created_at: Date.now(),
        expires_at: Date.now() + 300000
    })
    await newOtpVerification.save()
    let userFirstName = data.user_first_name ? data.user_first_name : "";
    let userLastName = data.user_last_name ? data.user_last_name : "";
    let userEmail = data.user_email ? data.user_email : "";
    let dataCount = data.data_count ? data.data_count : "";
    let panel_type = data.type ? data.type : "";
    let otpMail
    let otpMailSubject
    if(data.operationType === 'delete'){
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to delete ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Delete request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Delete Request!!`
    }
    else{
      otpMail = `<div>Dear Customer,</div> <br/>
      <div>${userFirstName} ${userLastName} ( ${userEmail} ) is requesting to export ${dataCount} records from ${panel_type} panel.</div> <br/>
      <div>Please use this <b>OTP ${otp}</b> to verify your Data Export request in READ PRO.</div> <br/>
      <div><b>This OTP is valid only for 5 mins</b>.</div><br/><br></br><br></br>
      <div>Best Regards</div>`

      otpMailSubject = `READ PRO Data Export Request!!`
    }
    // await sendMail(otpMail,[`${data.otp_mail}`],otpMailSubject);
    const mailOptions = {
      from: 'noreply@magicbricks.com', // sender address
      to: data.otp_mail, // list of receivers
      subject: otpMailSubject, // Subject line
      // text: 'Hello world?', // plain text body
      html: otpMail // html body
    };
    // Send the email
    // console.log("mailOptions",mailOptions)
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
     console.log("errorrrrrrr",error);
     return res.status(400).json({success:false,message:"Failed To Send OTP"});
  }
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
});
    res.status(200).json({success:true,message:"OTP Sent Successfully"})
    
  }catch(err){
    console.log(err);
    res.status(400).json({success:false,message:"Failed To Send OTP"});
  }
};

module.exports = otpVerificationController;
