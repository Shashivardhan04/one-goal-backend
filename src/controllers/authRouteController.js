require("dotenv").config();
var ObjectId = require('mongoose').Types.ObjectId;
const userModel = require('../models/userSchema');
const userActivityModel = require('../models/userActivitySchema');
const crypto = require('crypto');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const axios = require("axios");
const {encryptPAN,decryptPAN,encryptautoLogin,decryptautoLogin} =require("../constants/constants")
const { verifyPassword, hashPassword, generateSalt } = require("../functions/authScrypt");
const { v4: uuidv4 } = require('uuid');
const genUUID=()=>{
    return uuidv4()
};

// const axios = require("axios");
// const https = require('https');

// const MB_URL = process.env.MB_URL;
const MOBILE_UTILITY_URL=process.env.MOBILE_UTILITY_URL
const MB_BRICKS_URL = process.env.MB_BRICKS_URL;
const mb_android_version= process.env.MB_ANDROID_VERSION
const mb_ios_version=process.env.MB_IOS_VERSION
const {AlgebraicCaptcha} = require('algebraic-captcha');
// const axios = require("axios")
const MB_URL = process.env.MB_URL;
const AUTO_LOGIN_URL = process.env.MB_AUTO_LOGIN_URL;
const AUTO_LOGIN_KEY = process.env.AUTO_KEY;
const IV_KEY = process.env.IV_KEY;
const { CONSTANTS } = require("../constants/constants");

const loginTypes = CONSTANTS.loginTypes;
const activityTypes = CONSTANTS.activityTypes;

const generateToken = (uid, session_id, profile, device_type) => {
    return jwt.sign({ uid, session_id, profile, device_type }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET;
    return jwt.verify(token, secret);
};

const mbTokenGenration = async (userOid) => {
  try {
    const response = await axios({
      method: 'get',
      url: `${MB_URL}/userauthapi/token/generate`,
      params: {userId:userOid},
    });
    return response.data.token
  } catch (error) {
    return null
  }
};

const mbUserDataAndroid = async (token) => {
  try {

    const response = await axios({
      method: 'get', // Assuming it's a GET request
      url: `${MB_BRICKS_URL}/generateloginByToken.html`,
      headers: {
        'campCode': 'android',
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 14; moto g34 5G Build/U1UGS34.23-82-2-4)',
        'X-Api-Client': 'mb_android_app',
        'autoId': genUUID(),
        'AppVersion': mb_android_version,
        // 'deviceToken': 'He0lFBAsdo7YGxnvuKfyZg5deYhjVuTHFLKl+T6QRQvGsMnZE2RL1W4uB2pXuCzrdPrRLDN/SGwl0bEFFpNY97+uCo7s3xb7o5kNIL+gpaU=',
        'token': token
      }
    });

    return response.data;
  } catch (error) {
    return null
  }
};

const mbUserDataIos= async (token) => {
  try {
    const response = await axios({
      method: 'get', // Assuming it's a GET request
      url: `${MB_BRICKS_URL}/generateloginByToken.html`,
      headers: {
        'token': token,
        'AppVersion': mb_ios_version,
        'campCode': 'iPhone',
        'X-Api-Client': 'mb_ios_app',
        'autoId': genUUID(),
        'User-Agent': 'ios'
      }
    });
    return response.data
  } catch (error) {
    return null
  }
};
// const callAutoLoginFun=async()=>{
//     try {
//     const thirdPartyUrl =  AuthMbUrl;
//     const requestBody = {
//       url:autoUrl,
//       "userId": "56002995",
//       "validityInMins": 180
//     };


//       const response = await axios.post(thirdPartyUrl, requestBody);

//       // Return response data
//       return response.data;
//     } catch (error) {
//       // If an error occurs, handle it here
//       console.error("Error calling third-party API:", error.message);
//       return null;
//     }
//   }

const callAutoLoginFun = async (userId) => {
    try {
        const thirdPartyUrl = MB_URL + "/userauthapi/token/autoLoginUrl";
        const requestBody = {
            url: AUTO_LOGIN_URL,
            "userId": userId,
            "validityInMins": 180
        };

        const response = await axios.post(thirdPartyUrl, requestBody);

        // Return response data
        return response.data.token;
    } catch (error) {
        // If an error occurs, handle it here
        console.error("Error calling third-party API:", error.message);
        return null;
    }
}

const storeLoginHistory = async (activityData) => {
    try {
        // Insert the document
        const newDocument = await userActivityModel.create(activityData);
        return;
    } catch (error) {
        // Handle errors (e.g., validation or connection issues)
        console.error("Error inserting user login activity:", error);
        // throw new Error("Failed to insert login history");
    }
};


const authRouteController = {};

authRouteController.signIn = async (req, res) => {
    try {
        const { user_email, password, device_type,platform, device_id, device_ip, device_name } = req.body;
        let mbToken;
        let mbUserData;

        const user = await userModel.findOne({ user_email }).lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isPasswordValid = await verifyPassword(password, user.password, user.passwordSalt);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        if(user.status==="INACTIVE"){
            return res.status(400).json({ success: false, message: "User is INACTIVE,Contact Admin" });
        }

        const session_id = crypto.randomBytes(16).toString('hex');

        // Generate token
        const token = generateToken(user.uid, session_id, user.profile, device_type);
       
        if(user.user_oid){
          mbToken= await mbTokenGenration(user.user_oid);

          if(mbToken!==null){
            if(platform==="ANDROID"){
              mbUserData=await mbUserDataAndroid(mbToken)
            }else{
              mbUserData=await mbUserDataIos(mbToken)
            }
          }
        }

        const activityData = {
            device_id: device_id || "",
            device_ip: device_ip || "",
            device_name: device_name || "",
            organization_id: user.organization_id,
            uid: user.uid,
            session_id: session_id,
            device_type: device_type,
            user_oid: user.user_oid || "", // Example ObjectId
            user_last_login_via: loginTypes["EMAIL"],
            user_last_login_time: new Date(),
            activity_type: activityTypes["LOGIN"],
        };

        await storeLoginHistory(activityData);

        // Store the token in the user's record to enforce single-device sign-in
        const updatedUser = await userModel.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                    user_last_login_via:"Login via Email",
                    user_last_login_time: new Date(),
                    token,
                    session_id,
                    device_type
                }
            },
            { new: true }
        ).lean();
        let autoLogin=null
        
if(user.user_oid){
     autoLogin = await callAutoLoginFun(user.user_oid);
}
        


          const mbUsers={mbToken:mbToken,mbUserData:mbUserData}

        return res.status(200).json({
            success: true,
            message: "Sign In successful",
            data: {
                user: {
                    ...updatedUser,
                    password: null,
                    passwordSalt: null,
                    _id: null,
                    ...mbUsers,
                    autoToken:autoLogin
                }
            },
            // autoLogin: autoLogin
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred, please try again",
            error: error.message
        });
    }
};

authRouteController.signInV2 = async (req, res) => {
    try {
        const { user_email, password, device_type,platform,answer,captchaInput, device_id, device_ip, device_name} = req.body;
        if(decryptPAN(answer)!==captchaInput){
            return res.status(400).json({ success: false, message: 'invalid captcha' });
        }
        let mbToken;
        let mbUserData;

        const user = await userModel.findOne({ user_email }).lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isPasswordValid = await verifyPassword(password, user.password, user.passwordSalt);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: "Invalid password" });
        }

        if(user.status==="INACTIVE"){
            return res.status(400).json({ success: false, message: "User is INACTIVE,Contact Admin" });
        }

        const session_id = crypto.randomBytes(16).toString('hex');

        // Generate token
        const token = generateToken(user.uid, session_id, user.profile, device_type);
       
        if(user.user_oid){
          mbToken= await mbTokenGenration(user.user_oid);

          if(mbToken!==null){
            if(platform==="ANDROID"){
              mbUserData=await mbUserDataAndroid(mbToken)
            }else{
              mbUserData=await mbUserDataIos(mbToken)
            }
          }
        }

        const activityData = {
            device_id: device_id || "",
            device_ip: device_ip || "",
            device_name: device_name || "",
            organization_id: user.organization_id,
            uid: user.uid,
            session_id: session_id,
            device_type: device_type,
            user_oid: user.user_oid || "", // Example ObjectId
            user_last_login_via: loginTypes["EMAIL"],
            user_last_login_time: new Date(),
            activity_type: activityTypes["LOGIN"],
        };

        await storeLoginHistory(activityData);

        // Store the token in the user's record to enforce single-device sign-in
        const updatedUser = await userModel.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                    user_last_login_via:"Login via Email",
                    user_last_login_time: new Date(),
                    token,
                    session_id,
                    device_type
                }
            },
            { new: true }
        ).lean();
        let autoLogin=null
        
if(user.user_oid){
     autoLogin = await callAutoLoginFun(user.user_oid);
}
        


          const mbUsers={mbToken:mbToken,mbUserData:mbUserData}

        return res.status(200).json({
            success: true,
            message: "Sign In successful",
            data: {
                user: {
                    ...updatedUser,
                    password: null,
                    passwordSalt: null,
                    _id: null,
                    ...mbUsers,
                    autoToken:autoLogin
                }
            },
            // autoLogin: autoLogin
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred, please try again",
            error: error.message
        });
    }
};


authRouteController.signOut = async (req, res) => {
    try {
        const { _id } = req.user; // Assuming _id is set by authentication middleware

        const user = await userModel.findById(_id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Invalidate the token
        user.token = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Sign-out successful"
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occurred during sign-out",
            error: error.message
        });
    }
};

authRouteController.ResetPasswordForForgot = async (req, res) => {
    try {
        const { user_email, password } = req.body;
        if (!user_email || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing required parameters",
                error: "Missing required parameters",
            });
        }
        const decodeEmail = decodeURIComponent(user_email)
        const decryptEmail= decryptautoLogin(decodeEmail)
        if(decryptEmail === 'Decryption failed or invalid token' || decryptEmail === 'An error occurred during decryption'){

            return res.status(400).json({
                success: false,
                message: "An error occured , Please try again"
            });

        }else{
            let passwordSalt = await generateSalt();
            let hashedPassword = await hashPassword(password, passwordSalt);
            const user = await userModel.findOneAndUpdate(
                { user_email:decryptEmail },
                {
                    $set: {
                        password: hashedPassword,
                        passwordSalt: passwordSalt,
                        first_login: false
                    }
                },
                { new: true }
            );

        if(user){
            return res.status(200).json({
                success: true,
                message: "Password Updated successfully"
            });
        }
        else{

            return res.status(400).json({
                success: false,
                message: "An error occured , Please try again"
            });
        }
            
        }
        
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "An error occured, Please try again",
            error: error.message,
        });
    }
};


//////////////signIn With Otp ////////////////////////////////

const { AuthMbUrl, autoUrl } = require("../constants/constants")


const isValidMobile = (mobile) => {
    // Check if the mobile number is numeric and has a length between 10 and 15
    if (!/^\d{10,15}$/.test(mobile)) {
        return "Mobile number should be of min. 10 digits. Please re-enter";
    }

    // Check if the mobile number starts with a 0
    if (mobile.startsWith("0")) {
        return "Mobile number should not start with 0. Please re-enter.";
    }

    // Check if the mobile number starts with 6, 7, 8, or 9
    if (!/^[6789]/.test(mobile)) {
        return "Invalid Mobile Number. Please re-enter";
    }

    return true;
}

const genNum = () => {
    const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
    return randomNumber;
}

authRouteController.generateOtp = async (req, res) => {
    try {
        const { contact_no ,userIp} = req.body;

        const mess = isValidMobile(contact_no);
        if (mess !== true) {
            return res.status(200).json({ success: false, message: mess });
        }

        const check= await userModel.find({contact_no:contact_no}).lean();

        // console.log("ESFerferw",genNum())
           
          if(check.length===0){
            return res.status(200).json({
                success: true,
                message: 'OTP has been sent successfully',
                userId: encryptPAN(JSON.stringify(genNum())),
                validity:300
            })
          }

          if(check && check.length >1){
            return res.status(200).json({ success: false, message: 'duplicate mobile number exists,please contact admin' });
          }

        // console.log("userIp RIshabh",userIp)

        // Ensure contact_no is provided
        if (!contact_no) {
            return res.status(200).json({ success: false, message: 'Contact number is required' });
        }
       

        // Define the request payload

        const isd=check[0].user_mb_isd;
        const apiData = {
            mobile: contact_no,
            mobileIsd:  isd || "50",
            ipAddress: userIp || ""
        };

        // Make the HTTP request to the OTP service
        const response = await axios.post(MB_URL + '/userauthapi/otp/send-otp', apiData);

       const userId= encryptPAN(JSON.stringify(response.data.userId))

        // Handle the OTP service response
        if (response.data.Status === "Success") {
            return res.status(200).json({
                success: true,
                message: 'OTP has been sent successfully',
                userId: userId,
                validity: response.data.Validity || 300,
                isd:isd || "50"

            });
        } else {
            return res.status(200).json({
                message: response.data.Desc,
                success: false,
            });
        }
    } catch (error) {
        // console.error('Error generating OTP:', error);
        return res.status(400).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

authRouteController.verifyOtp = async (req, res) => {
    try {
        const { contact_no, otp, device_type, userId,isd,platform, device_id, device_ip, device_name } = req.body;
        let mbToken;
        let mbUserData;

        const decryptUserId=decryptPAN(userId);

        if (!contact_no) {
            return res.status(400).json({ success: false, message: 'Contact number is required' });
        }
        const apiData =
            { "rfnum":decryptUserId,"mobile": contact_no, "mobileIsd": isd || "50", "otp": otp }

        const response = await axios.post(MB_URL + '/userauthapi/otp/verify-read-pro-otp', apiData);

        if (response.data.otpVerifyStatus === false || response.data.otpVerifyStatus === null || response.data.otpVerifyStatus === undefined) {
            return res.status(200).json({ success: false, message: response.data.errordesc })
        }

        

        const user = await userModel.findOne({ user_oid: decryptUserId }).lean();
        
        if (!user) {
            
            //  console.log("response from autologin!!!!!!!!!!!!!!",data)
            return res.status(200).json({ success: false, message: "User not found"});
        }

        if(user.contact_no!==contact_no){
            return res.status(200).json({ success: false, message: "User not found" });
        }

        if(user.status==="INACTIVE"){
            return res.status(200).json({ success: false, message: "User is INACTIVE,Contact Admin" });
        }

        if(user.user_oid){
            mbToken= await mbTokenGenration(user.user_oid);
  
            if(mbToken!==null){
              if(platform==="ANDROID"){
                mbUserData=await mbUserDataAndroid(mbToken)
              }else{
                mbUserData=await mbUserDataIos(mbToken)
              }
            }
          }
        let data=null
        
if(user.user_oid){
     data = await callAutoLoginFun(decryptUserId)
}
        

        const session_id = crypto.randomBytes(16).toString('hex');

        // Generate token
        const token = generateToken(user.uid, session_id, user.profile, device_type);

        const activityData = {
            device_id: device_id || "",
            device_ip: device_ip || "",
            device_name: device_name || "",
            organization_id: user.organization_id,
            uid: user.uid,
            session_id: session_id,
            device_type: device_type,
            user_oid: user.user_oid || "", // Example ObjectId
            user_last_login_via: loginTypes["OTP"],
            user_last_login_time: new Date(),
            activity_type: activityTypes["LOGIN"],
        };

        await storeLoginHistory(activityData);

        // Store the token in the user's record to enforce single-device sign-in
        const updatedUser = await userModel.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                    user_last_login_via:"Login via OTP",
                    user_last_login_time: new Date(),
                    token,
                    session_id,
                    device_type,
                    contact_no,
                    first_login: false
                }
            },
            { new: true }
        ).lean();
    //    console.log("token",data.token)

    const mbUsers={mbToken:mbToken,mbUserData:mbUserData}

        return res.status(200).json({
            success: true,
            message: "Sign In successful",
            data: {
                user: {
                    ...updatedUser,
                    password: null,
                    passwordSalt: null,
                    _id: null,
                    ...mbUsers,
                    // autoToken:data.token  
                    autoToken:data  
                    // autoLogin: autoLogin
                }
            }
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}
authRouteController.autoLoginUrl = async (req, res) => {
    try {
        const { userId,device_type } = req.body; // Extract needed data from req.body
        let baseUrl=""
        if(device_type==="APP"){
          baseUrl=process.env.APP_URL
        }else{
            baseUrl=process.env.WEB_URL
        }
        // const userId = "345576455"; // Example user ID

        // Find the user by oid (or other unique identifier)
        const check = await userModel.findOne({ user_oid: userId }).lean();
        if (!check) {
            const autoLoginUrl = `${baseUrl}?token=${"USER_NOT_FOUND"}`;
            return res.status(200).json({ success: false, message: 'User not found',autoLoginUrl:autoLoginUrl });
        }

        const timeStamp = Date.now() + (24* 60 * 60 * 1000)
       
       let obj={device_type:device_type,userId:encryptautoLogin(userId),timeStamp:timeStamp}
       let encryptedToken=encryptautoLogin(JSON.stringify(obj))
        const autoLoginUrl = `${baseUrl}?token=${encodeURIComponent(encryptedToken)}`;

        // Generate a session ID
        const session_id = crypto.randomBytes(16).toString('hex');

        // Generate the JWT token
        const token = generateToken(check.uid, session_id, check.profile, device_type);

        const updatedUser = await userModel.findOneAndUpdate(
            { uid: check.uid },
            {
                $set: {
                    // user_last_login_via:"Login via autoLoginUrl",
                    // user_last_login_time: new Date(),
                    token,
                    session_id,
                    device_type
                }
            },
            { new: true }
        ).lean();
        // console.log("process.en", decryptPAN(encryptedToken))

        // Send the response
        return res.status(200).json({
            success: true,
            autoLoginUrl:autoLoginUrl, // Include the auto-login URL in the response
        });

    } catch (error) {
        console.error('Error generating auto-login URL:', error);
        // const autoLoginUrl = `${baseUrl}?token=${"Internal server error"}`;
        return res.status(500).json({ success: false, message: 'Internal server error'});
    }
};

authRouteController.getUserOid= async(req,res)=>{
    try {
        const{ userId,device_type,platform, device_id, device_ip, device_name }=req.query;
        // const baseUrl = process.env.WEB_URL;
        let mbToken;
        let mbUserData;

        const decryptUid=decryptautoLogin(userId);



        if(decryptUid){
            mbToken= await mbTokenGenration(decryptUid);
  
            if(mbToken!==null){
              if(platform==="ANDROID"){
                mbUserData=await mbUserDataAndroid(mbToken)
              }else{
                mbUserData=await mbUserDataIos(mbToken)
              }
            }
          }
        let data=null
        
if(decryptUid){
     data = await callAutoLoginFun(decryptUid)
}

        const check = await userModel.findOne({ user_oid: decryptUid}).lean();
        // const data = await callAutoLoginFun(decryptUid)
        if (!check) {
            // const autoLoginUrl = `${baseUrl}?token=${"USER_NOT_FOUND"}`;
            return res.status(200).json({ success: false, message: 'User not found'});
        }
        const mbUsers={mbToken:mbToken,mbUserData:mbUserData}

        const activityData = {
            device_id: device_id || "",
            device_ip: device_ip || "",
            device_name: device_name || "",
            organization_id: check.organization_id,
            uid: check.uid,
            session_id: check.session_id,
            device_type: device_type,
            user_oid: check.user_oid || "", // Example ObjectId
            user_last_login_via: loginTypes["AUTO_LOGIN"],
            user_last_login_time: new Date(),
            activity_type: activityTypes["LOGIN"],
        };

        await storeLoginHistory(activityData);

        return res.status(200).json({
            success: true,
            message: "Sign In successful",
            data: {
                user: {
                    ...check,
                    password: null,
                    passwordSalt: null,
                    _id: null,
                    // autoToken:data.token 
                    ...mbUsers,
                    autoToken:data  

                }
            }
        });


    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

authRouteController.createCaptcha = async (req, res) => {
    try {

        const algebraicCaptcha = new AlgebraicCaptcha({
            width:req.body.device_type==="APP"? 120:220,
            height:req.body.device_type==="APP"?35:100,
            background: '#ffffff',
            noise: 3,
            minValue: 1,
            maxValue: 9,
            operandAmount: 1,
            operandTypes: ['+'],
            mode: 'formula'
        });

        const { image, answer } = await algebraicCaptcha.generateCaptcha();
        const base64Image = Buffer.from(image).toString('base64');
        const imageUrl = `data:image/svg+xml;base64,${base64Image}`;

        const encryptAnswer=encryptPAN(JSON.stringify(answer))

        return res.status(200).json({ success: true, image:req.body.device_type==="APP"?image: imageUrl, answer: encryptAnswer })
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message })
    }
}


authRouteController.emailPassSignInMB = async (req, res) => {
    try {
        const { email,password,platform,device_type,answer,captchaInput, device_id, device_ip, device_name } = req.body;
        
        if(decryptPAN(answer)!==captchaInput){
            return res.status(400).json({ success: false, message: 'invalid captcha' });
        }

        let mbToken=""
        let mbUserData=""

        if (!email) {
            return res.status(400).json({ success: false, message: 'email is required' });
        }

        if (!password) {
            return res.status(400).json({ success: false, message: 'password is required' });
        }
        const apiData =
            { 
                email:email,
                password:password
             }

        const response = await axios.post(MOBILE_UTILITY_URL + '/user/readpro/login-by-email', apiData);

        if (response.data.status === "0" || response.data.status === null || response.data.status === undefined) {
            return res.status(400).json({ success: false, message: "Invalid Credentials" })
        }

        const userId=response.data.userId

        const user = await userModel.findOne({ user_oid: userId }).lean();

        
        if (!user) {
            //  console.log("response from autologin!!!!!!!!!!!!!!",data)
            return res.status(400).json({ success: false, message: "User not found"});
        }

        if(user.status==="INACTIVE"){
            return res.status(400).json({ success: false, message: "User is INACTIVE,Contact Admin" });
        }

        if(user.user_oid){
            mbToken= await mbTokenGenration(user.user_oid);
  
            if(mbToken!==null){
              if(platform==="ANDROID"){
                mbUserData=await mbUserDataAndroid(mbToken)
              }else{
                mbUserData=await mbUserDataIos(mbToken)
              }
            }
          }
        let data=null
        
if(user.user_oid){
     data = await callAutoLoginFun(user.user_oid)
}
        

        const session_id = crypto.randomBytes(16).toString('hex');

        // Generate token
        const token = generateToken(user.uid, session_id, user.profile, device_type);

        const activityData = {
            device_id: device_id || "",
            device_ip: device_ip || "",
            device_name: device_name || "",
            organization_id: user.organization_id,
            uid: user.uid,
            session_id: session_id,
            device_type: device_type,
            user_oid: user.user_oid || "", // Example ObjectId
            user_last_login_via: loginTypes["MB_EMAIL"],
            user_last_login_time: new Date(),
            activity_type: activityTypes["LOGIN"],
        };

        await storeLoginHistory(activityData);

        // Store the token in the user's record to enforce single-device sign-in
        const updatedUser = await userModel.findOneAndUpdate(
            { uid: user.uid },
            {
                $set: {
                    user_last_login_via:"Login via MBEMAIL",
                    user_last_login_time: new Date(),
                    token,
                    session_id,
                    device_type,
                    first_login: false
                }
            },
            { new: true }
        ).lean();
    //    console.log("token",data.token)

    const mbUsers={mbToken:mbToken,mbUserData:mbUserData}

        return res.status(200).json({
            success: true,
            message: "Sign In successful",
            data: {
                user: {
                    ...updatedUser,
                    password: null,
                    passwordSalt: null,
                    _id: null,
                    ...mbUsers,
                    // autoToken:data.token  
                    autoToken:data  
                    // autoLogin: autoLogin
                }
            }
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Internal Server Error',
            error: error.message
        });
    }
}

module.exports = authRouteController;