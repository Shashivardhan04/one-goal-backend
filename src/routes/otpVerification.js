const express = require("express");
const otpVerificationController = require("../controllers/otpVerificationController");
var router = express.Router();
//router.get('/', userController.createUser);

const { sendOtpVerfication,sendOtpVerficationNew, verifyOtp, resendOtp } =
otpVerificationController;

/**
 * @openapi
 * /otpVerification/sendOtp:
 *   post:
 *     summary: Send OTP Verification
 *     description: Send an OTP verification code to the user's registered contact information.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactInfo:
 *                 type: string
 *                 description: The user's contact information to send the OTP to.
 *             example:
 *               contactInfo: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - otpVerification
 */
router.post("/sendOtp", sendOtpVerfication);

router.post("/sendOtpNew", sendOtpVerficationNew);

/**
 * @openapi
 * /otpVerification/verifyOtp:
 *   post:
 *     summary: Verify OTP
 *     description: Verify the provided OTP code for user authentication.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otpCode:
 *                 type: string
 *                 description: The OTP code for verification.
 *             example:
 *               otpCode: "123456"
 *     responses:
 *       200:
 *         description: OTP verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - otpVerification
 */
router.post("/verifyOtp", verifyOtp);

/**
 * @openapi
 * /otpVerification/resendOtp:
 *   post:
 *     summary: Resend OTP
 *     description: Resend the OTP verification code to the user's registered contact information.
 *     security:
 *       - bearerAuth: []  # Reference the security scheme defined in app.js
 *     parameters:
 *       - in: header
 *         name: x-access-token
 *         required: true
 *         description: The authentication token.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactInfo:
 *                 type: string
 *                 description: The user's contact information to resend the OTP to.
 *             example:
 *               contactInfo: "user@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *     tags:
 *       - otpVerification
 */
router.post("/resendOtp", resendOtp);

module.exports = router;