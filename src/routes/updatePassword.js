const express = require("express");
const router = express.Router();
const logger = require("../services/logger"); // Ensure logger is properly imported
const app = require("../../firebase");

/**
 * 🔐 Update User Password
 * Updates a user's password after authentication, ensuring validation, error handling, and logging.
 */
router.put("/", async (req, res) => {
  try {
    /** 🛑 Validate request body */
    const { old_password, new_password, user_email } = req.body;
    if (!old_password || !new_password || !user_email) {
      logger.warn(
        "⚠️ Missing required parameters: old_password, new_password, user_email"
      );
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
        status: 400,
      });
    }

    logger.info(`🔄 Password update process initiated for user: ${user_email}`);

    /** 🔑 Authenticate the user */
    const userCredential = await app
      .auth()
      .signInWithEmailAndPassword(user_email, old_password);
    const currentUser = userCredential.user;

    if (!currentUser) {
      logger.warn(`⚠️ Authentication failed for user: ${user_email}`);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
        status: 401,
      });
    }

    /** 🔄 Update user password */
    await currentUser.updatePassword(new_password);
    logger.info(`✅ Password updated successfully for user: ${user_email}`);

    /** ✅ Return success response */
    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      status: 200,
    });
  } catch (error) {
    logger.error(
      `❌ Error updating password for user ${req.body.user_email}: ${error.message}`
    );

    /** 📌 Handle specific authentication errors */
    if (error.code === "auth/wrong-password") {
      return res.status(401).json({
        success: false,
        message: "Incorrect old password",
        status: 401,
      });
    } else if (error.code === "auth/user-not-found") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    return res.status(500).json({
      success: false,
      message: "An error occurred while updating the password",
      error: error.message,
      status: 500,
    });
  }
});

module.exports = router;
