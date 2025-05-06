const express = require('express');
const authRouteController = require('../controllers/authRouteController.js');
var router = express.Router();

const { signIn, signOut, ResetPasswordForForgot,generateOtp,verifyOtp,autoLoginUrl,getUserOid,createCaptcha,emailPassSignInMB,signInV2} = authRouteController;

router.post('/signIn', signIn);

router.post('/signOut', signOut);

router.post('/resetPasswordForForgot', ResetPasswordForForgot);

////////////otp based login ///////////////////////

router.post("/generateOtp",generateOtp)

router.post("/verifyOtp",verifyOtp)

router.post("/autoLoginUrl",autoLoginUrl)

router.get("/getUserOid",getUserOid)

router.post("/createCaptcha",createCaptcha)

router.post("/emailPassSignInMB",emailPassSignInMB)

router.post('/v2/signIn', signInV2);

module.exports = router;
